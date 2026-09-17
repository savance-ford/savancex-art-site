import { NextResponse } from "next/server";

import {
  OrderRepositoryError,
  OrderValidationError,
  attachStripeCustomer,
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
import {
  PrintfulApiError,
  PrintfulConfigurationError,
} from "@/lib/printful/errors";
import {
  getPrintfulShippingRates,
  PrintfulShippingValidationError,
} from "@/lib/printful/shipping";
import {
  normalizedAddressToJson,
  ShippingAddressValidationError,
} from "@/lib/shipping/address";
import {
  selectShippingRate,
  SelectedShippingMethodUnavailableError,
} from "@/lib/shipping/rates";
import {
  buildStripeCheckoutSessionParams,
  getOrCreateStripeCustomerId,
} from "@/lib/stripe/tax";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_REQUEST_BYTES = 16_384;
const RESPONSE_HEADERS = { "Cache-Control": "no-store" } as const;

function errorResponse(
  message: string,
  status: number,
  code?: CheckoutErrorResponse["code"],
) {
  return NextResponse.json<CheckoutErrorResponse>(
    { error: message, ...(code ? { code } : {}) },
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
    const selectedShippingRate = selectShippingRate(
      await getPrintfulShippingRates(
        checkoutRequest.shippingAddress,
        checkoutLines,
      ),
      checkoutRequest.shippingMethodId,
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

    const totalCents = subtotalCents + selectedShippingRate.amountCents;
    if (!Number.isSafeInteger(totalCents)) {
      throw new CheckoutCatalogUnavailableError(
        "The order total exceeds the supported range.",
      );
    }

    const { siteUrl } = getCheckoutConfiguration();
    const stripe = getStripeClient();
    const order = await createPendingOrder({
      currency: "usd",
      subtotal_cents: subtotalCents,
      shipping_cents: selectedShippingRate.amountCents,
      shipping_address: normalizedAddressToJson(
        checkoutRequest.shippingAddress,
      ),
      shipping_method_id: selectedShippingRate.id,
      shipping_method_name: selectedShippingRate.name,
      shipping_min_delivery_days: selectedShippingRate.minDeliveryDays,
      shipping_max_delivery_days: selectedShippingRate.maxDeliveryDays,
      shipping_min_delivery_date: selectedShippingRate.minDeliveryDate,
      shipping_max_delivery_date: selectedShippingRate.maxDeliveryDate,
      shipping_rate_quoted_at: new Date().toISOString(),
      customer_email: checkoutRequest.shippingAddress.email,
      customer_name: checkoutRequest.shippingAddress.name,
      customer_phone: checkoutRequest.shippingAddress.phone ?? null,
      tax_cents: 0,
      total_cents: totalCents,
      items: checkoutLines.map((line) => line.orderItem),
    });
    orderId = order.id;

    const stripeCustomerId = await getOrCreateStripeCustomerId({
      existingCustomerId: order.stripe_customer_id,
      address: checkoutRequest.shippingAddress,
      orderId: order.id,
      createCustomer: (params, options) =>
        stripe.customers.create(params, options),
    });
    await attachStripeCustomer(order.id, stripeCustomerId);

    const session = await stripe.checkout.sessions.create(
      buildStripeCheckoutSessionParams({
        order,
        lines: checkoutLines,
        shippingRate: selectedShippingRate,
        customerId: stripeCustomerId,
        siteUrl,
      }),
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

    if (error instanceof ShippingAddressValidationError) {
      return errorResponse(error.message, 400);
    }

    if (error instanceof SelectedShippingMethodUnavailableError) {
      return errorResponse(error.message, 409, "shipping_method_unavailable");
    }

    if (error instanceof CheckoutCatalogValidationError) {
      return errorResponse(error.message, 400);
    }

    if (error instanceof CheckoutCatalogUnavailableError) {
      return errorResponse(error.message, 503);
    }

    if (error instanceof PrintfulShippingValidationError) {
      return errorResponse(error.message, 422);
    }

    if (
      error instanceof PrintfulApiError ||
      error instanceof PrintfulConfigurationError
    ) {
      return errorResponse("Shipping rates are temporarily unavailable.", 503);
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
