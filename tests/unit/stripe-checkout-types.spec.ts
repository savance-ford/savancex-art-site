import { expect, test } from "@playwright/test";

import {
  CheckoutRequestValidationError,
  MAX_CHECKOUT_LINE_QUANTITY,
  parseCheckoutRequest,
} from "@/lib/stripe/checkout-types";

test("accepts only storefront variant IDs and bounded quantities", () => {
  expect(
    parseCheckoutRequest({
      items: [
        { variantId: "pf-123-456", quantity: 2 },
        { variantId: "variant_ABC:123", quantity: MAX_CHECKOUT_LINE_QUANTITY },
      ],
    }),
  ).toEqual({
    items: [
      { variantId: "pf-123-456", quantity: 2 },
      { variantId: "variant_ABC:123", quantity: 20 },
    ],
  });
});

test("rejects empty carts, malformed lines, duplicate variants, and browser prices", () => {
  const invalidRequests = [
    null,
    {},
    { items: [] },
    { items: [{ variantId: "", quantity: 1 }] },
    { items: [{ variantId: "bad id", quantity: 1 }] },
    { items: [{ variantId: "pf-1-2", quantity: 0 }] },
    { items: [{ variantId: "pf-1-2", quantity: 1.5 }] },
    { items: [{ variantId: "pf-1-2", quantity: 21 }] },
    { items: [{ variantId: "pf-1-2", quantity: 1, price: "0.01" }] },
    {
      items: [
        { variantId: "pf-1-2", quantity: 1 },
        { variantId: "pf-1-2", quantity: 2 },
      ],
    },
  ];

  for (const request of invalidRequests) {
    expect(() => parseCheckoutRequest(request)).toThrow(
      CheckoutRequestValidationError,
    );
  }
});
