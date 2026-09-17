import "server-only";

import type { AuthoritativeCheckoutLine } from "@/lib/stripe/checkout-catalog";
import { printfulRequest } from "@/lib/printful/client";
import type { NormalizedShippingAddress } from "@/lib/shipping/address";
import type { ShippingRate } from "@/lib/shipping/quote-types";
import { parsePrintfulShippingRates } from "@/lib/shipping/rates";

export class PrintfulShippingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintfulShippingValidationError";
  }
}

function buildShippingItems(lines: readonly AuthoritativeCheckoutLine[]) {
  return lines.map((line) => {
    const variantId = line.orderItem.printful_catalog_variant_id;
    if (!Number.isSafeInteger(variantId) || (variantId ?? 0) <= 0) {
      throw new PrintfulShippingValidationError(
        "A cart item is unavailable for shipping-rate calculation.",
      );
    }
    return { variant_id: variantId as number, quantity: line.request.quantity };
  });
}

export async function getPrintfulShippingRates(
  address: NormalizedShippingAddress,
  lines: readonly AuthoritativeCheckoutLine[],
): Promise<ShippingRate[]> {
  const response = await printfulRequest("/shipping/rates", {
    method: "POST",
    timeoutMs: 10_000,
    body: {
      recipient: {
        name: address.name,
        email: address.email,
        ...(address.phone ? { phone: address.phone } : {}),
        address1: address.addressLine1,
        ...(address.addressLine2 ? { address2: address.addressLine2 } : {}),
        city: address.city,
        state_code: address.stateCode,
        country_code: address.countryCode,
        zip: address.postalCode,
      },
      items: buildShippingItems(lines),
      currency: "USD",
      locale: "en_US",
    },
    parseResult: parsePrintfulShippingRates,
  });
  return response.result;
}
