import "server-only";

import Stripe from "stripe";

import { StripeConfigurationError } from "@/lib/stripe/errors";

let stripeClient: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new StripeConfigurationError(
      "Stripe is not configured. Missing: STRIPE_SECRET_KEY.",
    );
  }

  if (!secretKey.startsWith("sk_test_")) {
    throw new StripeConfigurationError(
      "Stripe must be configured with a test-mode secret key.",
    );
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}
