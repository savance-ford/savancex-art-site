import { NextResponse } from "next/server";

import {
  CheckoutCatalogUnavailableError,
  CheckoutCatalogValidationError,
  resolveAuthoritativeCheckoutLines,
} from "@/lib/stripe/checkout-catalog";
import { CheckoutRequestValidationError } from "@/lib/stripe/checkout-types";
import {
  PrintfulApiError,
  PrintfulConfigurationError,
} from "@/lib/printful/errors";
import {
  getPrintfulShippingRates,
  PrintfulShippingValidationError,
} from "@/lib/printful/shipping";
import { ShippingAddressValidationError } from "@/lib/shipping/address";
import {
  parseShippingQuoteRequest,
  type ShippingQuoteErrorResponse,
  type ShippingQuoteResponse,
} from "@/lib/shipping/quote-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_REQUEST_BYTES = 24_576;
const RESPONSE_HEADERS = { "Cache-Control": "no-store" } as const;

function errorResponse(error: string, status: number) {
  return NextResponse.json<ShippingQuoteErrorResponse>(
    { error },
    { status, headers: RESPONSE_HEADERS },
  );
}

async function readBody(request: Request): Promise<unknown> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new CheckoutRequestValidationError("Shipping quotes require application/json.");
  }
  const body = await request.text();
  if (!body || body.length > MAX_REQUEST_BYTES) {
    throw new CheckoutRequestValidationError("Shipping quote request is invalid or too large.");
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new CheckoutRequestValidationError("Shipping quote request contains invalid JSON.");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const quoteRequest = parseShippingQuoteRequest(await readBody(request));
    const lines = await resolveAuthoritativeCheckoutLines(quoteRequest.items);
    const rates = await getPrintfulShippingRates(quoteRequest.address, lines);
    return NextResponse.json<ShippingQuoteResponse>(
      { rates },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    if (
      error instanceof CheckoutRequestValidationError ||
      error instanceof ShippingAddressValidationError ||
      error instanceof CheckoutCatalogValidationError
    ) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof PrintfulShippingValidationError) {
      return errorResponse(error.message, 422);
    }
    if (
      error instanceof CheckoutCatalogUnavailableError ||
      error instanceof PrintfulApiError ||
      error instanceof PrintfulConfigurationError
    ) {
      return errorResponse("Shipping rates are temporarily unavailable.", 503);
    }
    return errorResponse("Unable to calculate shipping rates.", 500);
  }
}
