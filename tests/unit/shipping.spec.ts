import { expect, test } from "@playwright/test";

import {
  normalizeShippingAddress,
  normalizedAddressToJson,
  preserveExistingShippingAddress,
  ShippingAddressValidationError,
} from "@/lib/shipping/address";
import { parseShippingQuoteRequest } from "@/lib/shipping/quote-types";
import {
  parsePrintfulShippingRates,
  selectShippingRate,
  SelectedShippingMethodUnavailableError,
} from "@/lib/shipping/rates";
import { parseCheckoutRequest } from "@/lib/stripe/checkout-types";

const address = {
  name: "  Ada   Lovelace ",
  email: " ADA@Example.COM ",
  phone: " +1 415 555 0123 ",
  addressLine1: " 123   Main St ",
  addressLine2: " Apt 4 ",
  city: " Madison ",
  stateCode: "wi",
  postalCode: "53703-1234",
  countryCode: "us",
};

test("normalizes a complete US address without merging address lines", () => {
  expect(normalizeShippingAddress(address)).toEqual({
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+1 415 555 0123",
    addressLine1: "123 Main St",
    addressLine2: "Apt 4",
    city: "Madison",
    stateCode: "WI",
    postalCode: "53703-1234",
    countryCode: "US",
  });
});

test("keeps the Creekwood street and unit separate through both API contracts", () => {
  const separatedAddress = {
    name: "Test Customer",
    email: "customer@example.com",
    addressLine1: "4708 Creekwood Lane",
    addressLine2: "308",
    city: "Madison",
    stateCode: "WI",
    postalCode: "53704",
    countryCode: "US",
  };
  const expectedAddress = normalizeShippingAddress(separatedAddress);

  expect(
    parseShippingQuoteRequest({
      items: [{ variantId: "pf-1-2", quantity: 1 }],
      address: separatedAddress,
    }).address,
  ).toEqual(expectedAddress);
  expect(
    parseCheckoutRequest({
      items: [{ variantId: "pf-1-2", quantity: 1 }],
      shippingAddress: separatedAddress,
      shippingMethodId: "STANDARD",
    }).shippingAddress,
  ).toEqual(expectedAddress);
  expect(normalizedAddressToJson(expectedAddress)).toEqual(separatedAddress);
  expect(JSON.stringify(expectedAddress)).not.toContain(
    "4708 Creekwood Lane, Madison, WI 53704, 308",
  );
});

test("safely migrates only an exact combined address with known separate fields", () => {
  expect(
    normalizeShippingAddress({
      name: "Test Customer",
      email: "customer@example.com",
      addressLine1: "4708 Creekwood Lane, Madison, WI 53704, 308",
      addressLine2: "308",
      city: "Madison",
      stateCode: "WI",
      postalCode: "53704",
      countryCode: "US",
    }),
  ).toMatchObject({
    addressLine1: "4708 Creekwood Lane",
    addressLine2: "308",
  });
});

test("rejects an ambiguous combined address instead of parsing an unknown unit", () => {
  expect(() =>
    normalizeShippingAddress({
      name: "Test Customer",
      email: "customer@example.com",
      addressLine1: "4708 Creekwood Lane, Madison, WI 53704, 308",
      city: "Madison",
      stateCode: "WI",
      postalCode: "53704",
      countryCode: "US",
    }),
  ).toThrow("Re-enter the street and apartment/unit in their separate fields");
});

test("preserves legitimate comma-containing street addresses", () => {
  expect(
    normalizeShippingAddress({
      ...address,
      addressLine1: "Building A, 4708 Creekwood Lane",
    }).addressLine1,
  ).toBe("Building A, 4708 Creekwood Lane");
});

test("accepts only five-digit or ZIP+4 US postal codes", () => {
  expect(normalizeShippingAddress({ ...address, postalCode: "53703" }).postalCode).toBe(
    "53703",
  );

  for (const postalCode of ["5370", "537030", "53703 1234", "ABCDE"]) {
    expect(() => normalizeShippingAddress({ ...address, postalCode })).toThrow(
      ShippingAddressValidationError,
    );
  }
});

test("parses Printful decimal rates into exact integer cents", () => {
  expect(
    parsePrintfulShippingRates([
      {
        id: "STANDARD",
        name: "Flat Rate",
        rate: "4.95",
        currency: "USD",
        minDeliveryDays: 3,
        maxDeliveryDays: 6,
        minDeliveryDate: "2026-09-21",
        maxDeliveryDate: "2026-09-24",
      },
    ]),
  ).toEqual([
    {
      id: "STANDARD",
      name: "Flat Rate",
      amountCents: 495,
      currency: "USD",
      minDeliveryDays: 3,
      maxDeliveryDays: 6,
      minDeliveryDate: "2026-09-21",
      maxDeliveryDate: "2026-09-24",
    },
  ]);

  expect(() =>
    parsePrintfulShippingRates([
      { id: "STANDARD", name: "Flat Rate", rate: "4.951", currency: "USD" },
    ]),
  ).toThrow("invalid shipping amount");
});

test("rejects a selected method that disappeared during checkout revalidation", () => {
  const rates = parsePrintfulShippingRates([
    { id: "STANDARD", name: "Flat Rate", rate: "4.95", currency: "USD" },
  ]);

  expect(() => selectShippingRate(rates, "EXPRESS")).toThrow(
    SelectedShippingMethodUnavailableError,
  );
});

test("preserves the stored address when Stripe has no complete replacement", () => {
  const existing = normalizeShippingAddress(address);
  expect(preserveExistingShippingAddress(existing, null)).toEqual(existing);

  const incoming = normalizeShippingAddress({
    ...address,
    addressLine1: "500 New Street",
  });
  expect(preserveExistingShippingAddress(existing, incoming)).toEqual(incoming);
});
