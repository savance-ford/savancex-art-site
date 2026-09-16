import "server-only";

import type {
  CreateOrderInput,
  DatabaseOrder,
  DatabaseOrderItem,
  JsonValue,
  OrderWithItems,
} from "@/lib/orders/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export class OrderRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderRepositoryError";
  }
}

export class OrderValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

type PaidOrderDetails = {
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  stripeCustomerId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingAddress?: JsonValue | null;
  paidAt?: string;
};

function assertSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new OrderValidationError(
      `${label} must be a non-negative safe integer.`,
    );
  }
}

function validateCreateOrderInput(input: CreateOrderInput): void {
  const shippingCents = input.shipping_cents ?? 0;
  const taxCents = input.tax_cents ?? 0;
  const currency = input.currency ?? "usd";

  assertSafeNonNegativeInteger(input.subtotal_cents, "subtotal_cents");
  assertSafeNonNegativeInteger(shippingCents, "shipping_cents");
  assertSafeNonNegativeInteger(taxCents, "tax_cents");
  assertSafeNonNegativeInteger(input.total_cents, "total_cents");

  if (!/^[a-z]{3}$/.test(currency)) {
    throw new OrderValidationError(
      "currency must be a lowercase three-letter code.",
    );
  }

  if (input.items.length === 0) {
    throw new OrderValidationError("An order must contain at least one item.");
  }

  let itemSubtotal = 0;
  for (const item of input.items) {
    assertSafeNonNegativeInteger(
      item.unit_amount_cents,
      "item.unit_amount_cents",
    );
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new OrderValidationError(
        "item.quantity must be a positive safe integer.",
      );
    }
    assertSafeNonNegativeInteger(item.line_total_cents, "item.line_total_cents");

    const calculatedLineTotal = item.unit_amount_cents * item.quantity;
    if (
      !Number.isSafeInteger(calculatedLineTotal) ||
      calculatedLineTotal !== item.line_total_cents
    ) {
      throw new OrderValidationError(
        "item.line_total_cents must equal unit_amount_cents multiplied by quantity.",
      );
    }

    itemSubtotal += item.line_total_cents;
    if (!Number.isSafeInteger(itemSubtotal)) {
      throw new OrderValidationError("The item subtotal is too large.");
    }
  }

  if (itemSubtotal !== input.subtotal_cents) {
    throw new OrderValidationError(
      "subtotal_cents must equal the sum of the order item totals.",
    );
  }

  const calculatedTotal = input.subtotal_cents + shippingCents + taxCents;
  if (
    !Number.isSafeInteger(calculatedTotal) ||
    calculatedTotal !== input.total_cents
  ) {
    throw new OrderValidationError(
      "total_cents must equal subtotal_cents, shipping_cents, and tax_cents.",
    );
  }
}

export async function createPendingOrder(
  input: CreateOrderInput,
): Promise<OrderWithItems> {
  validateCreateOrderInput(input);

  const supabase = getSupabaseAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      currency: input.currency ?? "usd",
      subtotal_cents: input.subtotal_cents,
      shipping_cents: input.shipping_cents ?? 0,
      tax_cents: input.tax_cents ?? 0,
      total_cents: input.total_cents,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    throw new OrderRepositoryError("Unable to create the pending order.");
  }

  const itemRows = input.items.map((item) => ({
    ...item,
    order_id: order.id,
  }));
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows)
    .select("*");

  if (itemsError || !items) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw new OrderRepositoryError("Unable to save the order item snapshots.");
  }

  return { ...order, items };
}

export async function getOrderById(
  orderId: string,
): Promise<DatabaseOrder | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new OrderRepositoryError("Unable to load the order.");
  }

  return data;
}

export async function getOrderByStripeSessionId(
  stripeSessionId: string,
): Promise<DatabaseOrder | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .select("*")
    .eq("stripe_checkout_session_id", stripeSessionId)
    .maybeSingle();

  if (error) {
    throw new OrderRepositoryError("Unable to load the order.");
  }

  return data;
}

export async function getOrderItems(
  orderId: string,
): Promise<DatabaseOrderItem[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new OrderRepositoryError("Unable to load the order items.");
  }

  return data;
}

export async function attachStripeSession(
  orderId: string,
  stripeSessionId: string,
): Promise<DatabaseOrder> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      stripe_checkout_session_id: stripeSessionId,
      status: "checkout_created",
    })
    .eq("id", orderId)
    .eq("status", "checkout_pending")
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new OrderRepositoryError(
      "Unable to attach the Stripe Checkout Session.",
    );
  }

  return data;
}

export async function markOrderPaid(
  orderId: string,
  details: PaidOrderDetails,
): Promise<DatabaseOrder> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
      stripe_checkout_session_id: details.stripeCheckoutSessionId,
      stripe_payment_intent_id: details.stripePaymentIntentId,
      stripe_customer_id: details.stripeCustomerId,
      customer_email: details.customerEmail,
      customer_name: details.customerName,
      customer_phone: details.customerPhone,
      shipping_address: details.shippingAddress,
      paid_at: details.paidAt ?? new Date().toISOString(),
    })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new OrderRepositoryError("Unable to mark the order as paid.");
  }

  if (!data) {
    const existingOrder = await getOrderById(orderId);
    if (existingOrder?.payment_status === "paid") return existingOrder;
    throw new OrderRepositoryError("Unable to mark the order as paid.");
  }

  return data;
}

export async function markOrderPaymentProcessing(
  orderId: string,
  stripeSessionId: string,
): Promise<DatabaseOrder> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      status: "checkout_created",
      payment_status: "processing",
      stripe_checkout_session_id: stripeSessionId,
    })
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new OrderRepositoryError(
      "Unable to mark the order payment as processing.",
    );
  }

  return data ?? (await getOrderById(orderId)) ?? missingOrder();
}

export async function markOrderPaymentReview(
  orderId: string,
  stripeSessionId: string,
  stripePaymentIntentId: string | null,
): Promise<DatabaseOrder> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      status: "payment_review",
      payment_status: "processing",
      stripe_checkout_session_id: stripeSessionId,
      stripe_payment_intent_id: stripePaymentIntentId,
    })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new OrderRepositoryError(
      "Unable to mark the order for payment review.",
    );
  }

  return data ?? (await getOrderById(orderId)) ?? missingOrder();
}

export async function markOrderPaymentFailed(
  orderId: string,
  stripeSessionId?: string,
): Promise<DatabaseOrder> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      status: "payment_failed",
      payment_status: "failed",
      stripe_checkout_session_id: stripeSessionId,
    })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new OrderRepositoryError(
      "Unable to mark the order payment as failed.",
    );
  }

  return data ?? (await getOrderById(orderId)) ?? missingOrder();
}

export async function markOrderExpired(
  orderId: string,
  stripeSessionId?: string,
): Promise<DatabaseOrder> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      status: "expired",
      stripe_checkout_session_id: stripeSessionId,
    })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new OrderRepositoryError("Unable to mark the order as expired.");
  }

  return data ?? (await getOrderById(orderId)) ?? missingOrder();
}

function missingOrder(): never {
  throw new OrderRepositoryError("The order no longer exists.");
}
