import "server-only";

import type Stripe from "stripe";

import {
  OrderRepositoryError,
  markOrderExpired,
  markOrderPaid,
  markOrderPaymentFailed,
  markOrderPaymentProcessing,
  markOrderPaymentReview,
} from "@/lib/orders/repository";
import type { JsonValue } from "@/lib/orders/types";
import {
  createPrintfulDraftOrder,
  safePrintfulFulfillmentErrorMessage,
} from "@/lib/printful/orders";
import { getStripeClient } from "@/lib/stripe/client";
import {
  StripeOrderResolutionError,
  resolveOrderForCheckoutSession,
} from "@/lib/stripe/session-orders";

export const SUPPORTED_CHECKOUT_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export type CheckoutWebhookOutcome =
  | "paid"
  | "already_paid"
  | "processing"
  | "payment_review"
  | "payment_failed"
  | "expired";

export class StripeWebhookProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeWebhookProcessingError";
  }
}

function expandableId(
  value: string | { id: string } | null,
): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

function normalizeShippingAddress(
  session: Stripe.Checkout.Session,
): JsonValue | null {
  const shipping = session.collected_information?.shipping_details;
  if (!shipping) return null;

  return {
    name: shipping.name,
    address_line_1: shipping.address.line1,
    address_line_2: shipping.address.line2,
    city: shipping.address.city,
    state: shipping.address.state,
    postal_code: shipping.address.postal_code,
    country: shipping.address.country,
  };
}

function eventCheckoutSessionId(event: Stripe.Event): string {
  const object = event.data.object;
  if (!object || typeof object !== "object") {
    throw new StripeWebhookProcessingError(
      "Stripe event does not contain a Checkout Session.",
    );
  }

  const id = Reflect.get(object, "id");
  if (typeof id !== "string" || !id.startsWith("cs_test_")) {
    throw new StripeWebhookProcessingError(
      "Stripe event contains an invalid test Checkout Session ID.",
    );
  }

  return id;
}

async function retrieveEventSession(
  event: Stripe.Event,
): Promise<Stripe.Checkout.Session> {
  try {
    return await getStripeClient().checkout.sessions.retrieve(
      eventCheckoutSessionId(event),
    );
  } catch (error) {
    if (error instanceof StripeWebhookProcessingError) throw error;
    throw new StripeWebhookProcessingError(
      "Unable to retrieve the Stripe Checkout Session.",
    );
  }
}

async function processSuccessfulSession(
  session: Stripe.Checkout.Session,
): Promise<CheckoutWebhookOutcome> {
  const order = await resolveOrderForCheckoutSession(session);
  const paymentIntentId = expandableId(session.payment_intent);

  if (session.mode !== "payment") {
    throw new StripeWebhookProcessingError(
      "Stripe Checkout Session is not a payment Session.",
    );
  }

  const currencyMatches =
    session.currency?.toLowerCase() === order.currency.toLowerCase();
  const amountMatches = session.amount_total === order.total_cents;
  if (!currencyMatches || !amountMatches) {
    await markOrderPaymentReview(order.id, session.id, paymentIntentId);
    return "payment_review";
  }

  if (order.payment_status === "paid") {
    await attemptPrintfulDraft(order.id);
    return "already_paid";
  }

  if (session.payment_status === "unpaid") {
    await markOrderPaymentProcessing(order.id, session.id);
    return "processing";
  }

  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    throw new StripeWebhookProcessingError(
      "Stripe Checkout Session does not have a successful payment status.",
    );
  }

  const customerDetails = session.customer_details;
  const shippingDetails = session.collected_information?.shipping_details;
  const paidOrder = await markOrderPaid(order.id, {
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId: expandableId(session.customer),
    customerEmail: customerDetails?.email ?? session.customer_email,
    customerName:
      shippingDetails?.name ??
      customerDetails?.individual_name ??
      customerDetails?.name ??
      null,
    customerPhone: customerDetails?.phone ?? null,
    shippingAddress: normalizeShippingAddress(session),
    paidAt: new Date().toISOString(),
  });
  await attemptPrintfulDraft(paidOrder.id);

  return "paid";
}

async function attemptPrintfulDraft(orderId: string): Promise<void> {
  try {
    await createPrintfulDraftOrder(orderId);
  } catch (error) {
    const safeMessage = safePrintfulFulfillmentErrorMessage(error);
    console.error(
      `Printful draft creation failed for paid order ${orderId}: ${safeMessage}`,
    );
  }
}

export async function processCheckoutWebhookEvent(
  event: Stripe.Event,
): Promise<CheckoutWebhookOutcome> {
  const session = await retrieveEventSession(event);

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return processSuccessfulSession(session);

    case "checkout.session.async_payment_failed": {
      const order = await resolveOrderForCheckoutSession(session);
      if (order.payment_status === "paid") return "already_paid";
      await markOrderPaymentFailed(order.id, session.id);
      return "payment_failed";
    }

    case "checkout.session.expired": {
      const order = await resolveOrderForCheckoutSession(session);
      if (order.payment_status === "paid") return "already_paid";
      await markOrderExpired(order.id, session.id);
      return "expired";
    }

    default:
      throw new StripeWebhookProcessingError(
        "Unsupported event reached the Checkout event processor.",
      );
  }
}

export function safeWebhookErrorMessage(error: unknown): string {
  if (
    error instanceof StripeWebhookProcessingError ||
    error instanceof StripeOrderResolutionError
  ) {
    return error.message.slice(0, 500);
  }

  if (error instanceof OrderRepositoryError) {
    return "Unable to persist the Stripe payment state.";
  }

  return "Stripe webhook processing failed.";
}
