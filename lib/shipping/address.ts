import type { JsonValue } from "@/lib/orders/types";

export type ShippingAddressInput = {
  name: string;
  email: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
};

export type NormalizedShippingAddress = Omit<
  ShippingAddressInput,
  "countryCode"
> & { countryCode: "US" };

export const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["AS", "American Samoa"],
  ["GU", "Guam"],
  ["MP", "Northern Mariana Islands"],
  ["PR", "Puerto Rico"],
  ["VI", "U.S. Virgin Islands"],
] as const;

const US_STATE_CODES = new Set<string>(US_STATES.map(([code]) => code));
const ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ShippingAddressValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "ShippingAddressValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new ShippingAddressValidationError(`${label} is required.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) {
    throw new ShippingAddressValidationError(`${label} is invalid.`);
  }
  return normalized;
}

function optionalText(
  value: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return normalizeText(value, label, maxLength);
}

function separateLegacyCombinedAddressLine1({
  addressLine1,
  addressLine2,
  city,
  stateCode,
  postalCode,
}: {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateCode: string;
  postalCode: string;
}): string {
  const normalizedLine1 = addressLine1.toLocaleLowerCase("en-US");
  const localitySuffixes = [
    `, ${city}, ${stateCode} ${postalCode}`,
    `, ${city}, ${stateCode}, ${postalCode}`,
  ];

  for (const localitySuffix of localitySuffixes) {
    const suffixIndex = normalizedLine1.lastIndexOf(
      localitySuffix.toLocaleLowerCase("en-US"),
    );
    if (suffixIndex < 1) continue;

    const streetAddress = addressLine1.slice(0, suffixIndex).trim();
    const trailingValue = addressLine1
      .slice(suffixIndex + localitySuffix.length)
      .trim();
    const expectedLine2 = addressLine2 ? `, ${addressLine2}` : "";

    if (
      streetAddress &&
      trailingValue.toLocaleLowerCase("en-US") ===
        expectedLine2.toLocaleLowerCase("en-US")
    ) {
      return streetAddress;
    }

    throw new ShippingAddressValidationError(
      "Street address duplicates the city, state, or ZIP code. Re-enter the street and apartment/unit in their separate fields.",
    );
  }

  return addressLine1;
}

export function normalizeShippingAddress(value: unknown): NormalizedShippingAddress {
  if (!isRecord(value)) {
    throw new ShippingAddressValidationError("Shipping address is required.");
  }

  const allowedKeys = new Set([
    "name",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "stateCode",
    "postalCode",
    "countryCode",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new ShippingAddressValidationError("Shipping address contains unsupported fields.");
  }

  const email = normalizeText(value.email, "Email", 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ShippingAddressValidationError("Email is invalid.");
  }

  const stateCode = normalizeText(value.stateCode, "State", 2).toUpperCase();
  if (!US_STATE_CODES.has(stateCode)) {
    throw new ShippingAddressValidationError("Select a supported US state or territory.");
  }

  const postalCode = normalizeText(value.postalCode, "ZIP code", 10);
  if (!ZIP_PATTERN.test(postalCode)) {
    throw new ShippingAddressValidationError("ZIP code must be 12345 or 12345-6789.");
  }

  const countryCode = normalizeText(value.countryCode, "Country", 2).toUpperCase();
  if (countryCode !== "US") {
    throw new ShippingAddressValidationError("Shipping is currently limited to the United States.");
  }

  const phone = optionalText(value.phone, "Phone", 30);
  const addressLine2 = optionalText(
    value.addressLine2,
    "Apartment, suite, or unit",
    200,
  );
  const city = normalizeText(value.city, "City", 100);
  const addressLine1 = separateLegacyCombinedAddressLine1({
    addressLine1: normalizeText(value.addressLine1, "Street address", 200),
    ...(addressLine2 ? { addressLine2 } : {}),
    city,
    stateCode,
    postalCode,
  });

  return {
    name: normalizeText(value.name, "Full name", 100),
    email,
    ...(phone ? { phone } : {}),
    addressLine1,
    ...(addressLine2 ? { addressLine2 } : {}),
    city,
    stateCode,
    postalCode,
    countryCode: "US",
  };
}

export function normalizedAddressToJson(address: NormalizedShippingAddress): JsonValue {
  return { ...address };
}

export function preserveExistingShippingAddress(
  existing: JsonValue | null,
  completeIncoming: NormalizedShippingAddress | null,
): JsonValue | null {
  return completeIncoming ? normalizedAddressToJson(completeIncoming) : existing;
}
