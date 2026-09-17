import {
  parseCheckoutLines,
  CheckoutRequestValidationError,
  type CheckoutRequestLine,
} from "@/lib/stripe/checkout-types";
import {
  normalizeShippingAddress,
  type NormalizedShippingAddress,
  type ShippingAddressInput,
} from "@/lib/shipping/address";

export type ShippingQuoteRequest = {
  items: CheckoutRequestLine[];
  address: ShippingAddressInput;
};

export type ParsedShippingQuoteRequest = {
  items: CheckoutRequestLine[];
  address: NormalizedShippingAddress;
};

export type ShippingRate = {
  id: string;
  name: string;
  amountCents: number;
  currency: "USD";
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  minDeliveryDate: string | null;
  maxDeliveryDate: string | null;
};

export type ShippingQuoteResponse = { rates: ShippingRate[] };
export type ShippingQuoteErrorResponse = { error: string };

export function parseShippingQuoteRequest(value: unknown): ParsedShippingQuoteRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CheckoutRequestValidationError("Shipping quote request is invalid.");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 2 ||
    !keys.includes("items") ||
    !keys.includes("address")
  ) {
    throw new CheckoutRequestValidationError(
      "Shipping quote request contains unsupported fields.",
    );
  }

  return {
    items: parseCheckoutLines(record.items),
    address: normalizeShippingAddress(record.address),
  };
}
