import { StripeMoneyError } from "@/lib/stripe/errors";

const USD_DECIMAL_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

/** Converts a canonical, non-negative USD decimal string to integer cents. */
export function decimalStringToCents(value: string): number {
  const match = USD_DECIMAL_PATTERN.exec(value);

  if (!match) {
    throw new StripeMoneyError(
      "Price must be a non-negative decimal string with at most two decimal places.",
    );
  }

  const wholeDollars = BigInt(match[1]);
  const fractionalDigits = match[2] ?? "";
  const cents =
    wholeDollars * BigInt(100) +
    BigInt(fractionalDigits.padEnd(2, "0") || "0");

  if (cents > MAX_SAFE_CENTS) {
    throw new StripeMoneyError("Price exceeds JavaScript's safe integer range.");
  }

  return Number(cents);
}
