import { expect, test } from "@playwright/test";

import type {
  DatabaseOrder,
  DatabaseOrderItem,
} from "@/lib/orders/types";
import {
  buildPrintfulDraftOrderPayload,
  getPrintfulExternalId,
  getPrintfulOrderItemExternalId,
  isLegacyPrintfulExternalId,
  PrintfulFulfillmentValidationError,
} from "@/lib/printful/order-mapping";

const order: DatabaseOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  order_number: 42,
  status: "paid",
  payment_status: "paid",
  fulfillment_status: "not_started",
  currency: "usd",
  subtotal_cents: 6800,
  shipping_cents: 0,
  tax_cents: 0,
  total_cents: 6800,
  stripe_checkout_session_id: "cs_test_example",
  stripe_payment_intent_id: "pi_example",
  stripe_customer_id: "cus_example",
  customer_email: "buyer@example.com",
  customer_name: "Ada Lovelace",
  customer_phone: "+14155550123",
  shipping_address: {
    name: "Ada Lovelace",
    address_line_1: "123 Main St",
    address_line_2: "Apt 4",
    city: "Madison",
    state: "wi",
    postal_code: "53703",
    country: "us",
  },
  printful_order_id: null,
  printful_external_id: null,
  printful_status: null,
  printful_last_error: null,
  printful_last_attempt_at: null,
  printful_draft_created_at: null,
  paid_at: "2026-09-16T20:00:00.000Z",
  created_at: "2026-09-16T19:59:00.000Z",
  updated_at: "2026-09-16T20:00:00.000Z",
};

const item: DatabaseOrderItem = {
  id: "22222222-2222-4222-8222-222222222222",
  order_id: order.id,
  product_id: null,
  product_variant_id: null,
  storefront_product_id: "pf-100",
  storefront_variant_id: "pf-100-200",
  printful_sync_product_id: 100,
  printful_sync_variant_id: 200,
  printful_catalog_variant_id: 300,
  product_name: "SAVANCEX Tee",
  variant_name: "Black / M",
  color: "Black",
  size: "M",
  sku: "SX-TEE-M",
  unit_amount_cents: 3400,
  quantity: 2,
  line_total_cents: 6800,
  image_url: null,
  metadata: {},
  created_at: "2026-09-16T19:59:00.000Z",
};

test("maps verified order data to a stable Printful draft payload", () => {
  expect(buildPrintfulDraftOrderPayload(order, [item])).toEqual({
    external_id: "11111111111141118111111111111111",
    shipping: "STANDARD",
    recipient: {
      name: "Ada Lovelace",
      email: "buyer@example.com",
      phone: "+14155550123",
      address1: "123 Main St",
      address2: "Apt 4",
      city: "Madison",
      state_code: "WI",
      country_code: "US",
      zip: "53703",
    },
    items: [
      {
        external_id: "22222222222242228222222222222222",
        sync_variant_id: 200,
        quantity: 2,
      },
    ],
  });
});

test("normalizes UUID external IDs to stable 32-character lowercase hex", () => {
  const mixedCaseUuid = "904F9BBC-84B9-430E-9C07-E7E1ABC3A5A5";
  const expected = "904f9bbc84b9430e9c07e7e1abc3a5a5";

  expect(getPrintfulExternalId(mixedCaseUuid)).toBe(expected);
  expect(getPrintfulOrderItemExternalId(mixedCaseUuid)).toBe(expected);
  expect(expected).toHaveLength(32);
  expect(expected).toMatch(/^[0-9a-f]{32}$/);
});

test("recognizes only the exact legacy prefixed order external ID", () => {
  expect(isLegacyPrintfulExternalId(order.id, `savancex-${order.id}`)).toBe(
    true,
  );
  expect(isLegacyPrintfulExternalId(order.id, order.id)).toBe(false);
});

test("rejects missing shipping fields without fabricating recipient data", () => {
  expect(() =>
    buildPrintfulDraftOrderPayload(
      { ...order, shipping_address: { name: "Ada Lovelace" } },
      [item],
    ),
  ).toThrow(PrintfulFulfillmentValidationError);
});

test("rejects order items without a valid Printful Sync Variant ID", () => {
  expect(() =>
    buildPrintfulDraftOrderPayload(
      order,
      [{ ...item, printful_sync_variant_id: null }],
    ),
  ).toThrow("missing a valid Printful Sync Variant ID");
});
