import "server-only";

import type Stripe from "stripe";

import type {
  StripeWebhookEventRecord,
  StripeWebhookEventStatus,
} from "@/lib/orders/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PROCESSING_LEASE_MILLISECONDS = 5 * 60 * 1_000;

export class StripeWebhookPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeWebhookPersistenceError";
  }
}

export type StripeWebhookClaim =
  | { state: "claimed"; record: StripeWebhookEventRecord }
  | { state: "complete"; record: StripeWebhookEventRecord }
  | { state: "processing"; record: StripeWebhookEventRecord };

function checkoutSessionId(event: Stripe.Event): string | null {
  if (!event.type.startsWith("checkout.session.")) return null;
  const value = event.data.object;
  if (!value || typeof value !== "object") return null;
  const id = Reflect.get(value, "id");
  return typeof id === "string" ? id : null;
}

async function getWebhookEvent(
  stripeEventId: string,
): Promise<StripeWebhookEventRecord> {
  const { data, error } = await getSupabaseAdminClient()
    .from("stripe_webhook_events")
    .select("*")
    .eq("stripe_event_id", stripeEventId)
    .single();

  if (error || !data) {
    throw new StripeWebhookPersistenceError(
      "Unable to load the Stripe webhook event record.",
    );
  }

  return data;
}

async function reclaimWebhookEvent(
  record: StripeWebhookEventRecord,
): Promise<StripeWebhookEventRecord | null> {
  const now = new Date().toISOString();
  let query = getSupabaseAdminClient()
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      error_message: null,
      processed_at: null,
      received_at: now,
    })
    .eq("id", record.id);

  if (record.status === "failed" || record.status === "received") {
    query = query.eq("status", record.status);
  } else {
    const staleBefore = new Date(
      Date.now() - PROCESSING_LEASE_MILLISECONDS,
    ).toISOString();
    query = query.eq("status", "processing").lt("received_at", staleBefore);
  }

  const { data, error } = await query.select("*").maybeSingle();
  if (error) {
    throw new StripeWebhookPersistenceError(
      "Unable to claim the Stripe webhook event.",
    );
  }

  return data;
}

export async function claimStripeWebhookEvent(
  event: Stripe.Event,
): Promise<StripeWebhookClaim> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      status: "processing",
      checkout_session_id: checkoutSessionId(event),
    })
    .select("*")
    .single();

  if (!error && data) return { state: "claimed", record: data };

  if (error?.code !== "23505") {
    throw new StripeWebhookPersistenceError(
      "Unable to record the Stripe webhook event.",
    );
  }

  const existing = await getWebhookEvent(event.id);
  if (existing.status === "processed" || existing.status === "ignored") {
    return { state: "complete", record: existing };
  }

  const reclaimed = await reclaimWebhookEvent(existing);
  return reclaimed
    ? { state: "claimed", record: reclaimed }
    : { state: "processing", record: existing };
}

async function updateWebhookStatus(
  stripeEventId: string,
  status: StripeWebhookEventStatus,
  errorMessage: string | null,
): Promise<void> {
  const { data, error } = await getSupabaseAdminClient()
    .from("stripe_webhook_events")
    .update({
      status,
      error_message: errorMessage,
      processed_at:
        status === "processed" || status === "ignored"
          ? new Date().toISOString()
          : null,
    })
    .eq("stripe_event_id", stripeEventId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new StripeWebhookPersistenceError(
      "Unable to update the Stripe webhook event status.",
    );
  }
}

export async function markStripeWebhookProcessed(
  stripeEventId: string,
): Promise<void> {
  await updateWebhookStatus(stripeEventId, "processed", null);
}

export async function markStripeWebhookIgnored(
  stripeEventId: string,
): Promise<void> {
  await updateWebhookStatus(stripeEventId, "ignored", null);
}

export async function markStripeWebhookFailed(
  stripeEventId: string,
  safeErrorMessage: string,
): Promise<void> {
  await updateWebhookStatus(
    stripeEventId,
    "failed",
    safeErrorMessage.slice(0, 500),
  );
}
