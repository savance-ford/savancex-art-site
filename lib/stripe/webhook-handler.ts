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
  normalizeShippingAddress,
  preserveExistingShippingAddress,
  type NormalizedShippingAddress,
} from "@/lib/shipping/address";
import {
  StripeOrderResolutionError,
  resolveOrderForCheckoutSession,
} from "@/lib/stripe/session-orders";
import { reconcileStripeCheckoutTax } from "@/lib/stripe/tax";

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

function normalizeStripeShippingAddress(
  session: Stripe.Checkout.Session,
): NormalizedShippingAddress | null {
  const shipping = session.collected_information?.shipping_details;
  if (!shipping) return null;
  const customer = session.customer_details;

  try {
    return normalizeShippingAddress({
      name: shipping.name,
      email: customer?.email ?? session.customer_email,
      phone: customer?.phone,
      addressLine1: shipping.address.line1,
      addressLine2: shipping.address.line2,
      city: shipping.address.city,
      stateCode: shipping.address.state,
      postalCode: shipping.address.postal_code,
      countryCode: shipping.address.country,
    });
  } catch {
    return null;
  }
}

function nonEmpty(value: string | null | undefined): string | null {
  return value?.trim() || null;
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

  const taxReconciliation = reconcileStripeCheckoutTax(session, order);
  if (!taxReconciliation.amountsReconciled) {
    await markOrderPaymentReview(
      order.id,
      session.id,
      paymentIntentId,
      taxReconciliation.automaticTaxStatus,
    );
    console.error(
      `Stripe Tax reconciliation requires review for order ${order.id} (status: ${taxReconciliation.automaticTaxStatus ?? "missing"}).`,
    );
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
  const stripeShippingAddress = normalizeStripeShippingAddress(session);
  const paidOrder = await markOrderPaid(order.id, {
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId:
      expandableId(session.customer) ?? order.stripe_customer_id,
    customerEmail:
      nonEmpty(customerDetails?.email ?? session.customer_email) ??
      order.customer_email,
    customerName:
      nonEmpty(
        shippingDetails?.name ??
          customerDetails?.individual_name ??
          customerDetails?.name,
      ) ?? order.customer_name,
    customerPhone:
      nonEmpty(customerDetails?.phone) ?? order.customer_phone,
    shippingAddress: preserveExistingShippingAddress(
      order.shipping_address,
      stripeShippingAddress,
    ) as JsonValue | null,
    taxCents: taxReconciliation.taxCents,
    totalCents: taxReconciliation.totalCents,
    stripeTaxStatus: taxReconciliation.automaticTaxStatus,
    stripeTaxCalculationId: null,
    stripeTaxTransactionId: null,
    stripeTaxCollectedAt: new Date().toISOString(),
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
