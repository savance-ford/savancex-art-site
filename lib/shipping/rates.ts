import { StripeMoneyError } from "@/lib/stripe/errors";
import { decimalStringToCents } from "@/lib/stripe/money";
import type { ShippingRate } from "@/lib/shipping/quote-types";

export class SelectedShippingMethodUnavailableError extends Error {
  constructor() {
    super("The selected shipping method is no longer available. Refresh shipping rates.");
    this.name = "SelectedShippingMethodUnavailableError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string, maxLength: number): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new TypeError(`Invalid Printful shipping field: ${key}.`);
  }
  return value.trim();
}

function optionalPositiveInteger(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError("Invalid Printful delivery estimate.");
  }
  return value as number;
}

function optionalDate(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError("Invalid Printful delivery date.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new TypeError("Invalid Printful delivery date.");
  }
  return value;
}

export function parsePrintfulShippingRates(value: unknown): ShippingRate[] {
  if (!Array.isArray(value)) throw new TypeError("Expected a Printful shipping-rate array.");

  const seenIds = new Set<string>();
  return value.map((candidate) => {
    if (!isRecord(candidate)) throw new TypeError("Expected a Printful shipping-rate object.");
    const id = requiredString(candidate, "id", 128);
    if (!/^[A-Za-z0-9._:-]+$/.test(id)) {
      throw new TypeError("Printful returned an invalid shipping method ID.");
    }
    const name = requiredString(candidate, "name", 200);
    const currency = requiredString(candidate, "currency", 3).toUpperCase();
    if (currency !== "USD") throw new TypeError("Printful returned a non-USD shipping rate.");
    if (seenIds.has(id)) throw new TypeError("Printful returned a duplicate shipping method.");
    seenIds.add(id);

    let amountCents: number;
    try {
      amountCents = decimalStringToCents(requiredString(candidate, "rate", 32));
    } catch (error) {
      if (error instanceof StripeMoneyError) {
        throw new TypeError("Printful returned an invalid shipping amount.");
      }
      throw error;
    }

    const minDeliveryDays = optionalPositiveInteger(candidate.minDeliveryDays);
    const maxDeliveryDays = optionalPositiveInteger(candidate.maxDeliveryDays);
    const minDeliveryDate = optionalDate(candidate.minDeliveryDate);
    const maxDeliveryDate = optionalDate(candidate.maxDeliveryDate);
    if (
      (minDeliveryDays && maxDeliveryDays && minDeliveryDays > maxDeliveryDays) ||
      (minDeliveryDate && maxDeliveryDate && minDeliveryDate > maxDeliveryDate)
    ) {
      throw new TypeError("Printful returned an invalid delivery window.");
    }

    return {
      id, name, amountCents, currency: "USD" as const,
      minDeliveryDays, maxDeliveryDays, minDeliveryDate, maxDeliveryDate,
    };
  });
}

export function selectShippingRate(
  rates: readonly ShippingRate[],
  shippingMethodId: string,
): ShippingRate {
  const selected = rates.find((rate) => rate.id === shippingMethodId);
  if (!selected) throw new SelectedShippingMethodUnavailableError();
  return selected;
}
