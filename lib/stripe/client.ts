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

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new StripeConfigurationError(
      "Stripe webhooks are not configured. Missing: STRIPE_WEBHOOK_SECRET.",
    );
  }

  if (!webhookSecret.startsWith("whsec_")) {
    throw new StripeConfigurationError(
      "STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret.",
    );
  }

  return webhookSecret;
}
