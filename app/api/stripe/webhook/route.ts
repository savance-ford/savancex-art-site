import { NextResponse } from "next/server";

import {
  getStripeClient,
  getStripeWebhookSecret,
} from "@/lib/stripe/client";
import { StripeConfigurationError } from "@/lib/stripe/errors";
import {
  SUPPORTED_CHECKOUT_EVENT_TYPES,
  processCheckoutWebhookEvent,
  safeWebhookErrorMessage,
} from "@/lib/stripe/webhook-handler";
import {
  StripeWebhookPersistenceError,
  claimStripeWebhookEvent,
  markStripeWebhookFailed,
  markStripeWebhookIgnored,
  markStripeWebhookProcessed,
} from "@/lib/stripe/webhook-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RESPONSE_HEADERS = { "Cache-Control": "no-store" } as const;

function response(body: Record<string, string>, status = 200) {
  return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}

export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return response({ error: "Missing Stripe signature." }, 400);
  }

  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      console.error("Stripe webhook configuration is unavailable.");
      return response({ error: "Webhook is temporarily unavailable." }, 503);
    }
    throw error;
  }

  let event;
  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    return response({ error: "Invalid Stripe signature." }, 400);
  }

  try {
    const claim = await claimStripeWebhookEvent(event);
    if (claim.state === "complete") {
      return response({ status: "already_processed" });
    }
    if (claim.state === "processing") {
      return response({ error: "Event is already being processed." }, 409);
    }

    if (event.livemode) {
      await markStripeWebhookIgnored(event.id);
      return response({ status: "ignored_live_event" });
    }

    if (!SUPPORTED_CHECKOUT_EVENT_TYPES.has(event.type)) {
      await markStripeWebhookIgnored(event.id);
      return response({ status: "ignored" });
    }

    try {
      await processCheckoutWebhookEvent(event);
      await markStripeWebhookProcessed(event.id);
      return response({ status: "processed" });
    } catch (error) {
      const safeMessage = safeWebhookErrorMessage(error);
      try {
        await markStripeWebhookFailed(event.id, safeMessage);
      } catch {
        console.error(
          `Unable to record failure for Stripe event ${event.id}.`,
        );
      }
      console.error(
        `Stripe event ${event.id} failed during application processing.`,
      );
      return response({ error: "Webhook processing failed." }, 500);
    }
  } catch (error) {
    if (error instanceof StripeWebhookPersistenceError) {
      console.error(`Unable to persist Stripe event ${event.id}.`);
      return response({ error: "Webhook persistence failed." }, 500);
    }
    console.error(`Unexpected failure while handling Stripe event ${event.id}.`);
    return response({ error: "Webhook processing failed." }, 500);
  }
}
