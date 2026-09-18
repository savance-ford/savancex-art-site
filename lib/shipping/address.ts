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

export const ADDRESS_LINE1_AUTOFILL_ERROR =
  "Street address should contain only the street address. City, state, and ZIP are entered separately below.";

export type AddressAutofillNormalization = {
  addressLine1: string;
  addressLine2: string;
  repaired: boolean;
  error: string | null;
};

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

function literalPattern(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
}

function normalizedComparison(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function isUnambiguousUnit(value: string): boolean {
  const explicitUnit =
    /^(?:apt(?:artment)?|suite|ste|unit|room|rm|floor|fl|building|bldg|lot|dept)\.?\s*#?\s*[a-z0-9][a-z0-9 ./#'-]{0,24}$/i;
  const compactUnit = /^(?:#\s*)?(?=[a-z0-9/-]*\d)[a-z0-9]{1,10}(?:[-/][a-z0-9]{1,10})?$/i;
  return explicitUnit.test(value) || compactUnit.test(value);
}

/**
 * Repairs one known browser-autofill failure without parsing a free-form address.
 * A change is made only when line 1 contains an exact city/state/ZIP suffix that
 * duplicates the separately supplied structured fields.
 */
export function normalizeAddressAutofill({
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
}): AddressAutofillNormalization {
  const unchanged = {
    addressLine1,
    addressLine2: addressLine2 ?? "",
    repaired: false,
    error: null,
  };
  const state = US_STATES.find(([code]) => code === stateCode.trim().toUpperCase());
  if (!addressLine1.trim() || !city.trim() || !state || !postalCode.trim()) {
    return unchanged;
  }

  const stateRepresentations = [state[0], state[1]]
    .map(literalPattern)
    .join("|");
  const duplicatedSuffix = new RegExp(
    `^(?<street>.+),\\s*${literalPattern(city)}\\s*,\\s*(?:${stateRepresentations})(?:\\s+|\\s*,\\s*)${literalPattern(postalCode)}(?:\\s*,\\s*(?<unit>.*))?$`,
    "i",
  );
  const match = duplicatedSuffix.exec(addressLine1.trim());
  if (!match?.groups) return unchanged;

  const streetAddress = match.groups.street?.trim() ?? "";
  const trailingUnit = match.groups.unit;
  const existingLine2 = addressLine2?.trim() ?? "";
  if (!streetAddress) {
    return { ...unchanged, error: ADDRESS_LINE1_AUTOFILL_ERROR };
  }

  if (trailingUnit === undefined) {
    return {
      addressLine1: streetAddress,
      addressLine2: existingLine2,
      repaired: true,
      error: null,
    };
  }

  const unit = trailingUnit.trim().replace(/\s+/g, " ");
  const matchesExistingLine2 =
    existingLine2 &&
    normalizedComparison(existingLine2) === normalizedComparison(unit);
  if (
    !unit ||
    (existingLine2 && !matchesExistingLine2) ||
    (!existingLine2 && !isUnambiguousUnit(unit))
  ) {
    return { ...unchanged, error: ADDRESS_LINE1_AUTOFILL_ERROR };
  }

  return {
    addressLine1: streetAddress,
    addressLine2: existingLine2 || unit,
    repaired: true,
    error: null,
  };
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
  const suppliedAddressLine2 = optionalText(
    value.addressLine2,
    "Apartment, suite, or unit",
    200,
  );
  const city = normalizeText(value.city, "City", 100);
  const autofillNormalization = normalizeAddressAutofill({
    addressLine1: normalizeText(value.addressLine1, "Street address", 200),
    addressLine2: suppliedAddressLine2 ?? "",
    city,
    stateCode,
    postalCode,
  });
  if (autofillNormalization.error) {
    throw new ShippingAddressValidationError(autofillNormalization.error);
  }
  const addressLine1 = autofillNormalization.addressLine1;
  const addressLine2 = optionalText(
    autofillNormalization.addressLine2,
    "Apartment, suite, or unit",
    200,
  );

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
