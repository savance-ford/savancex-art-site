import { expect, test } from "@playwright/test";
import type Stripe from "stripe";

import { normalizeShippingAddress } from "@/lib/shipping/address";
import type { AuthoritativeCheckoutLine } from "@/lib/stripe/checkout-catalog";
import {
  buildStripeCheckoutSessionParams,
  buildStripeCustomerParams,
  getOrCreateStripeCustomerId,
  reconcileStripeCheckoutTax,
  STRIPE_APPAREL_TAX_CODE,
  STRIPE_SHIPPING_TAX_CODE,
} from "@/lib/stripe/tax";

const address = normalizeShippingAddress({
  name: "Test Customer",
  email: "customer@example.com",
  phone: "+16085550123",
  addressLine1: "4708 Creekwood Lane",
  addressLine2: "308",
  city: "Madison",
  stateCode: "WI",
  postalCode: "53704",
  countryCode: "US",
});

const line: AuthoritativeCheckoutLine = {
  request: { variantId: "pf-100-200", quantity: 1 },
  orderItem: {
    storefront_product_id: "pf-100",
    storefront_variant_id: "pf-100-200",
    product_name: "SAVANCEX Tee",
    unit_amount_cents: 3400,
    quantity: 1,
    line_total_cents: 3400,
  },
  stripeName: "SAVANCEX Tee",
  stripeDescription: "Black / M",
  stripeTaxCode: STRIPE_APPAREL_TAX_CODE,
};

test("maps the normalized address to both Stripe Customer address fields", () => {
  expect(
    buildStripeCustomerParams(
      address,
      "11111111-1111-4111-8111-111111111111",
    ),
  ).toMatchObject({
    email: "customer@example.com",
    name: "Test Customer",
    phone: "+16085550123",
    address: {
      line1: "4708 Creekwood Lane",
      line2: "308",
      city: "Madison",
      state: "WI",
      postal_code: "53704",
      country: "US",
    },
    shipping: {
      name: "Test Customer",
      phone: "+16085550123",
      address: {
        line1: "4708 Creekwood Lane",
        line2: "308",
        city: "Madison",
        state: "WI",
        postal_code: "53704",
        country: "US",
      },
    },
    metadata: { order_id: "11111111-1111-4111-8111-111111111111" },
    tax: { validate_location: "immediately" },
  });
});

test("reuses an existing Stripe Customer without creating another", async () => {
  let createCalls = 0;
  const customerId = await getOrCreateStripeCustomerId({
    existingCustomerId: "cus_existing",
    address,
    orderId: "11111111-1111-4111-8111-111111111111",
    createCustomer: async () => {
      createCalls += 1;
      return { id: "cus_new" };
    },
  });

  expect(customerId).toBe("cus_existing");
  expect(createCalls).toBe(0);
});

test("creates a Stripe Customer with an order-scoped idempotency key", async () => {
  let receivedOptions: Stripe.RequestOptions | undefined;
  const customerId = await getOrCreateStripeCustomerId({
    existingCustomerId: null,
    address,
    orderId: "11111111-1111-4111-8111-111111111111",
    createCustomer: async (_params, options) => {
      receivedOptions = options;
      return { id: "cus_created" };
    },
  });

  expect(customerId).toBe("cus_created");
  expect(receivedOptions?.idempotencyKey).toBe(
    "checkout-customer:11111111-1111-4111-8111-111111111111",
  );
});

test("creates tax-enabled Checkout with exclusive merchandise and shipping tax", () => {
  const params = buildStripeCheckoutSessionParams({
    order: {
      id: "11111111-1111-4111-8111-111111111111",
      order_number: 42,
    },
    lines: [line],
    shippingRate: {
      id: "STANDARD",
      name: "Flat Rate",
      amountCents: 504,
      currency: "USD",
      minDeliveryDays: 3,
      maxDeliveryDays: 6,
      minDeliveryDate: null,
      maxDeliveryDate: null,
    },
    customerId: "cus_existing",
    siteUrl: new URL("https://store.example"),
  });

  expect(params).toMatchObject({
    mode: "payment",
    customer: "cus_existing",
    automatic_tax: { enabled: true },
    line_items: [
      {
        price_data: {
          tax_behavior: "exclusive",
          product_data: { tax_code: STRIPE_APPAREL_TAX_CODE },
        },
      },
    ],
    shipping_options: [
      {
        shipping_rate_data: {
          fixed_amount: { amount: 504, currency: "usd" },
          tax_code: STRIPE_SHIPPING_TAX_CODE,
          tax_behavior: "exclusive",
        },
      },
    ],
  });
  expect(params).not.toHaveProperty("shipping_address_collection");
  expect(params).not.toHaveProperty("customer_email");
});

function checkoutSession(overrides: {
  amountTotal?: number;
  taxCents?: number;
  taxStatus?: "complete" | "failed" | "requires_location_inputs";
} = {}): Stripe.Checkout.Session {
  const taxCents = overrides.taxCents ?? 221;
  return {
    amount_subtotal: 3400,
    amount_total: overrides.amountTotal ?? 3400 + 504 + taxCents,
    automatic_tax: {
      enabled: true,
      liability: null,
      provider: "stripe",
      status: overrides.taxStatus ?? "complete",
    },
    currency: "usd",
    total_details: {
      amount_discount: 0,
      amount_shipping: 504,
      amount_tax: taxCents,
    },
  } as Stripe.Checkout.Session;
}

const orderAmounts = {
  currency: "usd",
  subtotal_cents: 3400,
  shipping_cents: 504,
};

test("uses Stripe tax and reconciles subtotal plus shipping plus tax", () => {
  expect(reconcileStripeCheckoutTax(checkoutSession(), orderAmounts)).toEqual({
    automaticTaxStatus: "complete",
    taxCents: 221,
    totalCents: 4125,
    amountsReconciled: true,
  });
});

test("sends amount mismatches and incomplete tax calculations to review", () => {
  expect(
    reconcileStripeCheckoutTax(
      checkoutSession({ amountTotal: 4126 }),
      orderAmounts,
    ).amountsReconciled,
  ).toBe(false);
  expect(
    reconcileStripeCheckoutTax(
      checkoutSession({ taxStatus: "requires_location_inputs" }),
      orderAmounts,
    ),
  ).toMatchObject({
    automaticTaxStatus: "requires_location_inputs",
    amountsReconciled: false,
  });
});
