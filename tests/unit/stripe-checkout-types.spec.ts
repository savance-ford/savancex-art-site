import { expect, test } from "@playwright/test";

import {
  CheckoutRequestValidationError,
  MAX_CHECKOUT_LINE_QUANTITY,
  parseCheckoutRequest,
} from "@/lib/stripe/checkout-types";

const shippingAddress = {
  name: "  Test   Customer ",
  email: " CUSTOMER@example.com ",
  addressLine1: " 123 Test Street ",
  city: " Madison ",
  stateCode: "wi",
  postalCode: "53703",
  countryCode: "us",
};

test("accepts only storefront variant IDs and bounded quantities", () => {
  expect(
    parseCheckoutRequest({
      items: [
        { variantId: "pf-123-456", quantity: 2 },
        { variantId: "variant_ABC:123", quantity: MAX_CHECKOUT_LINE_QUANTITY },
      ],
      shippingAddress,
      shippingMethodId: "STANDARD",
    }),
  ).toEqual({
    items: [
      { variantId: "pf-123-456", quantity: 2 },
      { variantId: "variant_ABC:123", quantity: 20 },
    ],
    shippingAddress: {
      name: "Test Customer",
      email: "customer@example.com",
      addressLine1: "123 Test Street",
      city: "Madison",
      stateCode: "WI",
      postalCode: "53703",
      countryCode: "US",
    },
    shippingMethodId: "STANDARD",
  });
});

test("rejects empty carts, malformed lines, duplicate variants, and browser prices", () => {
  const invalidRequests = [
    null,
    {},
    { items: [], shippingAddress, shippingMethodId: "STANDARD" },
    {
      items: [{ variantId: "", quantity: 1 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
    },
    {
      items: [{ variantId: "bad id", quantity: 1 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
    },
    {
      items: [{ variantId: "pf-1-2", quantity: 0 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
    },
    {
      items: [{ variantId: "pf-1-2", quantity: 1.5 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
    },
    {
      items: [{ variantId: "pf-1-2", quantity: 21 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
    },
    {
      items: [{ variantId: "pf-1-2", quantity: 1, price: "0.01" }],
      shippingAddress,
      shippingMethodId: "STANDARD",
    },
    {
      items: [{ variantId: "pf-1-2", quantity: 1 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
      shippingCents: 1,
    },
    {
      items: [{ variantId: "pf-1-2", quantity: 1 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
      total: 1,
    },
    {
      items: [{ variantId: "pf-1-2", quantity: 1 }],
      shippingAddress,
      shippingMethodId: "STANDARD",
      tax_cents: 1,
    },
    {
      items: [
        { variantId: "pf-1-2", quantity: 1 },
        { variantId: "pf-1-2", quantity: 2 },
      ],
      shippingAddress,
      shippingMethodId: "STANDARD",
    },
  ];

  for (const request of invalidRequests) {
    expect(() => parseCheckoutRequest(request)).toThrow(
      CheckoutRequestValidationError,
    );
  }
});
