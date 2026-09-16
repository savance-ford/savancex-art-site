import { expect, test } from "@playwright/test";

import { StripeMoneyError } from "@/lib/stripe/errors";
import { decimalStringToCents } from "@/lib/stripe/money";

test("converts canonical USD decimal strings without floating point math", () => {
  expect(decimalStringToCents("0")).toBe(0);
  expect(decimalStringToCents("0.5")).toBe(50);
  expect(decimalStringToCents("38.00")).toBe(3_800);
  expect(decimalStringToCents("90071992547409.91")).toBe(
    Number.MAX_SAFE_INTEGER,
  );
});

test("rejects malformed, negative, over-precise, and unsafe prices", () => {
  for (const value of [
    "",
    " 38.00",
    "+1.00",
    "-1.00",
    "01.00",
    "1.001",
    "1e2",
    "90071992547409.92",
  ]) {
    expect(() => decimalStringToCents(value), value).toThrow(StripeMoneyError);
  }
});
