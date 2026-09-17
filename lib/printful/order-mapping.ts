import type {
  DatabaseOrder,
  DatabaseOrderItem,
  JsonValue,
} from "@/lib/orders/types";
import {
  normalizeShippingAddress,
  type NormalizedShippingAddress,
} from "@/lib/shipping/address";

type JsonRecord = { [key: string]: JsonValue | undefined };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  shipping: string;
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

function getUuidExternalId(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new PrintfulFulfillmentValidationError(`${label} is not a valid UUID.`);
  }

  return value.replaceAll("-", "").toLowerCase();
}

export function getPrintfulExternalId(orderId: string): string {
  return getUuidExternalId(orderId, "Order ID");
}

export function getPrintfulOrderItemExternalId(orderItemId: string): string {
  return getUuidExternalId(orderItemId, "Order item ID");
}

export function isLegacyPrintfulExternalId(
  orderId: string,
  externalId: string,
): boolean {
  return externalId === `savancex-${orderId}`;
}

export function mapPrintfulRecipient(order: DatabaseOrder): PrintfulRecipient {
  if (!isJsonRecord(order.shipping_address)) {
    throw new PrintfulFulfillmentValidationError(
      "The paid order has no valid shipping address.",
    );
  }

  const address = order.shipping_address;
  let normalized: NormalizedShippingAddress;
  try {
    const usesCurrentShape = "addressLine1" in address;
    normalized = normalizeShippingAddress(
      usesCurrentShape
        ? {
            ...address,
            email: address.email ?? order.customer_email,
            phone: address.phone ?? order.customer_phone,
          }
        : {
            name: address.name ?? order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone,
            addressLine1: address.address_line_1,
            addressLine2: address.address_line_2,
            city: address.city,
            stateCode: address.state,
            postalCode: address.postal_code,
            countryCode: address.country,
          },
    );
  } catch {
    throw new PrintfulFulfillmentValidationError(
      "The paid order has no valid shipping address.",
    );
  }

  return {
    name: normalized.name,
    email: normalized.email,
    ...(normalized.phone ? { phone: normalized.phone } : {}),
    address1: normalized.addressLine1,
    ...(normalized.addressLine2 ? { address2: normalized.addressLine2 } : {}),
    city: normalized.city,
    state_code: normalized.stateCode,
    country_code: normalized.countryCode,
    zip: normalized.postalCode,
  };
}

function printfulShippingMethod(order: DatabaseOrder): string {
  const method = order.shipping_method_id?.trim();
  if (method && /^[A-Za-z0-9._:-]{1,128}$/.test(method)) return method;
  if (order.shipping_rate_quoted_at) {
    throw new PrintfulFulfillmentValidationError(
      "The paid order is missing its selected Printful shipping method.",
    );
  }
  return "STANDARD";
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
    shipping: printfulShippingMethod(order),
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
        external_id: getPrintfulOrderItemExternalId(item.id),
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
