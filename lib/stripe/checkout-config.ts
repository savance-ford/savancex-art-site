import "server-only";

import { StripeConfigurationError } from "@/lib/stripe/errors";

const DEFAULT_ALLOWED_COUNTRIES = ["US"] as const;
const MAX_ALLOWED_COUNTRIES = 25;
const ISO_COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export type CheckoutConfiguration = {
  siteUrl: URL;
  allowedCountries: string[];
};

function isRecognizedCountryCode(code: string): boolean {
  const displayName = new Intl.DisplayNames(["en"], { type: "region" }).of(
    code,
  );
  return Boolean(
    displayName && displayName !== code && displayName !== "Unknown Region",
  );
}

export function parseAllowedCountries(value: string | undefined): string[] {
  if (!value?.trim()) return [...DEFAULT_ALLOWED_COUNTRIES];

  const candidates = value
    .split(",")
    .map((country) => country.trim().toUpperCase());
  if (
    candidates.length > MAX_ALLOWED_COUNTRIES ||
    candidates.some(
      (country) =>
        !ISO_COUNTRY_CODE_PATTERN.test(country) ||
        !isRecognizedCountryCode(country),
    )
  ) {
    throw new StripeConfigurationError(
      "CHECKOUT_ALLOWED_COUNTRIES must contain valid comma-separated ISO country codes.",
    );
  }

  return [...new Set(candidates)];
}

function parseSiteUrl(value: string | undefined): URL {
  if (!value) {
    throw new StripeConfigurationError(
      "Stripe Checkout is not configured. Missing: NEXT_PUBLIC_SITE_URL.",
    );
  }

  try {
    const url = new URL(value);
    if (
      !url.hostname ||
      (url.protocol !== "https:" && url.protocol !== "http:")
    ) {
      throw new Error("Unsupported site URL protocol.");
    }
    return url;
  } catch {
    throw new StripeConfigurationError(
      "NEXT_PUBLIC_SITE_URL must be a valid HTTP or HTTPS URL.",
    );
  }
}

export function getCheckoutConfiguration(): CheckoutConfiguration {
  return {
    siteUrl: parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
    allowedCountries: parseAllowedCountries(
      process.env.CHECKOUT_ALLOWED_COUNTRIES,
    ),
  };
}
