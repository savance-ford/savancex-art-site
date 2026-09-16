import "server-only";

import type Stripe from "stripe";

import {
  getOrderById,
  getOrderByStripeSessionId,
} from "@/lib/orders/repository";
import type { DatabaseOrder } from "@/lib/orders/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class StripeOrderResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeOrderResolutionError";
  }
}

function optionalIdentifier(value: string | null | undefined): string | null {
  const identifier = value?.trim();
  return identifier || null;
}

export async function resolveOrderForCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<DatabaseOrder> {
  const metadataOrderId = optionalIdentifier(session.metadata?.order_id);
  const referenceOrderId = optionalIdentifier(session.client_reference_id);

  if (
    (metadataOrderId && !UUID_PATTERN.test(metadataOrderId)) ||
    (referenceOrderId && !UUID_PATTERN.test(referenceOrderId))
  ) {
    throw new StripeOrderResolutionError(
      "Stripe Session contains an invalid order identifier.",
    );
  }

  if (
    metadataOrderId &&
    referenceOrderId &&
    metadataOrderId !== referenceOrderId
  ) {
    throw new StripeOrderResolutionError(
      "Stripe Session order identifiers do not agree.",
    );
  }

  const declaredOrderId = metadataOrderId ?? referenceOrderId;
  const [declaredOrder, sessionOrder] = await Promise.all([
    declaredOrderId ? getOrderById(declaredOrderId) : Promise.resolve(null),
    getOrderByStripeSessionId(session.id),
  ]);

  if (declaredOrder && sessionOrder && declaredOrder.id !== sessionOrder.id) {
    throw new StripeOrderResolutionError(
      "Stripe Session resolves to conflicting orders.",
    );
  }

  if (
    declaredOrderId &&
    sessionOrder &&
    declaredOrderId !== sessionOrder.id
  ) {
    throw new StripeOrderResolutionError(
      "Stripe Session order identifiers do not agree.",
    );
  }

  const order = declaredOrder ?? sessionOrder;
  if (!order) {
    throw new StripeOrderResolutionError(
      "No order matches the Stripe Checkout Session.",
    );
  }

  if (
    order.stripe_checkout_session_id &&
    order.stripe_checkout_session_id !== session.id
  ) {
    throw new StripeOrderResolutionError(
      "The order belongs to a different Stripe Checkout Session.",
    );
  }

  return order;
}
