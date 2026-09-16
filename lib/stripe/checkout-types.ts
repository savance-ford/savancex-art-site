export const MAX_CHECKOUT_LINES = 50;
export const MAX_CHECKOUT_LINE_QUANTITY = 20;

const STOREFRONT_VARIANT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type CheckoutRequestLine = {
  variantId: string;
  quantity: number;
};

export type CheckoutRequest = {
  items: CheckoutRequestLine[];
};

export type CheckoutResponse = {
  checkoutUrl: string;
  orderId: string;
};

export type CheckoutErrorResponse = {
  error: string;
};

export class CheckoutRequestValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutRequestValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key))
  );
}

export function parseCheckoutRequest(value: unknown): CheckoutRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ["items"])) {
    throw new CheckoutRequestValidationError(
      "Checkout request must contain only an items array.",
    );
  }

  if (!Array.isArray(value.items) || value.items.length === 0) {
    throw new CheckoutRequestValidationError("Your cart is empty.");
  }

  if (value.items.length > MAX_CHECKOUT_LINES) {
    throw new CheckoutRequestValidationError("Your cart has too many lines.");
  }

  const seenVariantIds = new Set<string>();
  const items = value.items.map((candidate): CheckoutRequestLine => {
    if (
      !isRecord(candidate) ||
      !hasOnlyKeys(candidate, ["variantId", "quantity"])
    ) {
      throw new CheckoutRequestValidationError(
        "Each cart line must contain only a variantId and quantity.",
      );
    }

    const { variantId, quantity } = candidate;
    if (
      typeof variantId !== "string" ||
      !STOREFRONT_VARIANT_ID_PATTERN.test(variantId)
    ) {
      throw new CheckoutRequestValidationError(
        "A cart line contains an invalid variant ID.",
      );
    }

    if (
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_CHECKOUT_LINE_QUANTITY
    ) {
      throw new CheckoutRequestValidationError(
        `Each quantity must be an integer from 1 to ${MAX_CHECKOUT_LINE_QUANTITY}.`,
      );
    }

    if (seenVariantIds.has(variantId)) {
      throw new CheckoutRequestValidationError(
        "Duplicate variants must be combined into one cart line.",
      );
    }
    seenVariantIds.add(variantId);

    return { variantId, quantity };
  });

  return { items };
}
