import type {
  DatabaseOrder,
  DatabaseOrderItem,
  JsonValue,
} from "@/lib/orders/types";

type JsonRecord = { [key: string]: JsonValue | undefined };

export type PrintfulRecipient = {
  name: string;
  email?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
};

export type PrintfulDraftOrderPayload = {
  external_id: string;
  shipping: "STANDARD";
  recipient: PrintfulRecipient;
  items: Array<{
    external_id: string;
    sync_variant_id: number;
    quantity: number;
  }>;
};

export class PrintfulFulfillmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintfulFulfillmentValidationError";
  }
}

function isJsonRecord(value: JsonValue | null): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: JsonRecord, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new PrintfulFulfillmentValidationError(`${label} is missing.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getPrintfulExternalId(orderId: string): string {
  return `savancex-${orderId}`;
}

export function mapPrintfulRecipient(order: DatabaseOrder): PrintfulRecipient {
  if (!isJsonRecord(order.shipping_address)) {
    throw new PrintfulFulfillmentValidationError(
      "The paid order has no valid shipping address.",
    );
  }

  const address = order.shipping_address;
  const countryCode = requiredString(
    address,
    "country",
    "Shipping country code",
  ).toUpperCase();
  const stateCode = requiredString(
    address,
    "state",
    "Shipping state code",
  ).toUpperCase();

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new PrintfulFulfillmentValidationError(
      "Shipping country code must use a two-letter code.",
    );
  }

  if (countryCode === "US" && !/^[A-Z]{2}$/.test(stateCode)) {
    throw new PrintfulFulfillmentValidationError(
      "US shipping state code must use a two-letter code.",
    );
  }

  return {
    name: requiredString(address, "name", "Shipping recipient name"),
    ...(optionalString(order.customer_email)
      ? { email: optionalString(order.customer_email) }
      : {}),
    ...(optionalString(order.customer_phone)
      ? { phone: optionalString(order.customer_phone) }
      : {}),
    address1: requiredString(
      address,
      "address_line_1",
      "Shipping address line 1",
    ),
    ...(optionalString(address.address_line_2)
      ? { address2: optionalString(address.address_line_2) }
      : {}),
    city: requiredString(address, "city", "Shipping city"),
    state_code: stateCode,
    country_code: countryCode,
    zip: requiredString(address, "postal_code", "Shipping postal code"),
  };
}

export function buildPrintfulDraftOrderPayload(
  order: DatabaseOrder,
  items: readonly DatabaseOrderItem[],
): PrintfulDraftOrderPayload {
  if (items.length === 0) {
    throw new PrintfulFulfillmentValidationError(
      "The paid order has no fulfillment items.",
    );
  }

  return {
    external_id: getPrintfulExternalId(order.id),
    shipping: "STANDARD",
    recipient: mapPrintfulRecipient(order),
    items: items.map((item) => {
      if (
        !Number.isSafeInteger(item.printful_sync_variant_id) ||
        (item.printful_sync_variant_id ?? 0) <= 0
      ) {
        throw new PrintfulFulfillmentValidationError(
          "An order item is missing a valid Printful Sync Variant ID.",
        );
      }

      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        throw new PrintfulFulfillmentValidationError(
          "An order item has an invalid fulfillment quantity.",
        );
      }

      return {
        external_id: item.id,
        sync_variant_id: item.printful_sync_variant_id as number,
        quantity: item.quantity,
      };
    }),
  };
}

export function hasValidPrintfulRecipient(order: DatabaseOrder): boolean {
  try {
    mapPrintfulRecipient(order);
    return true;
  } catch {
    return false;
  }
}
