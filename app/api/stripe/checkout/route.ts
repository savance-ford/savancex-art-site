import { NextResponse } from "next/server";

import {
  OrderRepositoryError,
  OrderValidationError,
  attachStripeSession,
  createPendingOrder,
} from "@/lib/orders/repository";
import {
  CheckoutCatalogUnavailableError,
  CheckoutCatalogValidationError,
  resolveAuthoritativeCheckoutLines,
} from "@/lib/stripe/checkout-catalog";
import { getCheckoutConfiguration } from "@/lib/stripe/checkout-config";
import {
  CheckoutRequestValidationError,
  type CheckoutErrorResponse,
  type CheckoutResponse,
  parseCheckoutRequest,
} from "@/lib/stripe/checkout-types";
import { getStripeClient } from "@/lib/stripe/client";
import { StripeConfigurationError } from "@/lib/stripe/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 16_384;
const RESPONSE_HEADERS = { "Cache-Control": "no-store" } as const;

function errorResponse(message: string, status: number) {
  return NextResponse.json<CheckoutErrorResponse>(
    { error: message },
    { status, headers: RESPONSE_HEADERS },
  );
}

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new CheckoutRequestValidationError(
      "Checkout requests must use application/json.",
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new CheckoutRequestValidationError("Checkout request is too large.");
  }

  try {
    return await request.json();
  } catch {
    throw new CheckoutRequestValidationError(
      "Checkout request contains invalid JSON.",
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let orderId: string | undefined;

  try {
    const checkoutRequest = parseCheckoutRequest(await readRequestBody(request));
    const checkoutLines = await resolveAuthoritativeCheckoutLines(
      checkoutRequest.items,
    );
    const subtotalCents = checkoutLines.reduce(
      (total, line) => total + line.orderItem.line_total_cents,
      0,
    );

    if (!Number.isSafeInteger(subtotalCents)) {
      throw new CheckoutCatalogUnavailableError(
        "The cart total exceeds the supported range.",
      );
    }

    const { siteUrl, allowedCountries } = getCheckoutConfiguration();
    const stripe = getStripeClient();
    const order = await createPendingOrder({
      currency: "usd",
      subtotal_cents: subtotalCents,
      shipping_cents: 0,
      tax_cents: 0,
      total_cents: subtotalCents,
      items: checkoutLines.map((line) => line.orderItem),
    });
    orderId = order.id;

    const successUrl = `${new URL("/checkout/success", siteUrl).href}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = new URL("/cart?checkout=cancelled", siteUrl).href;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: order.id,
        metadata: {
          order_id: order.id,
          order_number: String(order.order_number),
        },
        line_items: checkoutLines.map((line) => ({
          quantity: line.request.quantity,
          price_data: {
            currency: "usd",
            unit_amount: line.orderItem.unit_amount_cents,
            product_data: {
              name: line.stripeName,
              description: line.stripeDescription,
              images: line.stripeImageUrl ? [line.stripeImageUrl] : undefined,
            },
          },
        })),
        shipping_address_collection: {
          allowed_countries: allowedCountries,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      { idempotencyKey: `checkout-session:${order.id}` },
    );

    if (!session.url) {
      throw new Error("Stripe Checkout Session did not include a redirect URL.");
    }

    await attachStripeSession(order.id, session.id);

    return NextResponse.json<CheckoutResponse>(
      { checkoutUrl: session.url, orderId: order.id },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    if (error instanceof CheckoutRequestValidationError) {
      return errorResponse(error.message, 400);
    }

    if (error instanceof CheckoutCatalogValidationError) {
      return errorResponse(error.message, 400);
    }

    if (error instanceof CheckoutCatalogUnavailableError) {
      return errorResponse(error.message, 503);
    }

    if (
      error instanceof StripeConfigurationError ||
      error instanceof OrderRepositoryError ||
      error instanceof OrderValidationError
    ) {
      console.error(
        `Checkout setup failed${orderId ? ` for order ${orderId}` : ""} (${error.name}).`,
      );
      return errorResponse("Checkout is temporarily unavailable.", 503);
    }

    console.error(
      `Stripe Checkout failed${orderId ? ` for order ${orderId}` : ""} (${error instanceof Error ? error.name : "UnknownError"}).`,
    );
    return errorResponse("Unable to start secure checkout.", 502);
  }
}
