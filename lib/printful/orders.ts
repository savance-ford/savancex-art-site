import "server-only";

import type {
  DatabaseOrder,
  DatabaseOrderItem,
  FulfillmentStatus,
} from "@/lib/orders/types";
import {
  buildPrintfulDraftOrderPayload,
  getPrintfulExternalId,
  hasValidPrintfulRecipient,
  PrintfulFulfillmentValidationError,
} from "@/lib/printful/order-mapping";
import { printfulRequest } from "@/lib/printful/client";
import {
  PrintfulApiError,
  PrintfulConfigurationError,
} from "@/lib/printful/errors";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTEMPT_LEASE_MS = 5 * 60 * 1_000;
const MAX_ERROR_LENGTH = 500;

export type PrintfulFulfillmentErrorKind =
  | "not_found"
  | "ineligible"
  | "validation"
  | "provider"
  | "configuration"
  | "persistence";

export class PrintfulFulfillmentError extends Error {
  readonly kind: PrintfulFulfillmentErrorKind;

  constructor(kind: PrintfulFulfillmentErrorKind, message: string) {
    super(message);
    this.name = "PrintfulFulfillmentError";
    this.kind = kind;
  }
}

export type PrintfulFulfillmentReadiness = {
  eligible: boolean;
  orderId: string;
  paymentStatus: DatabaseOrder["payment_status"];
  orderStatus: DatabaseOrder["status"];
  fulfillmentStatus: FulfillmentStatus;
  hasShippingAddress: boolean;
  hasValidShippingRecipient: boolean;
  itemCount: number;
  allItemsHavePrintfulSyncVariantIds: boolean;
  alreadyHasPrintfulOrder: boolean;
  attemptInProgress: boolean;
};

export type PrintfulDraftCreationResult = {
  outcome: "draft_created" | "already_created" | "in_progress";
  orderId: string;
  fulfillmentStatus: FulfillmentStatus;
  printfulOrderId: string | null;
  printfulExternalId: string;
  printfulStatus: string | null;
};

type LoadedFulfillmentOrder = {
  order: DatabaseOrder;
  items: DatabaseOrderItem[];
};

type PrintfulOrderResponse = {
  id: string;
  externalId: string | null;
  status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePrintfulOrder(value: unknown): PrintfulOrderResponse {
  if (!isRecord(value)) throw new TypeError("Expected a Printful order object.");

  const rawId = value.id;
  const id =
    typeof rawId === "number" && Number.isSafeInteger(rawId) && rawId > 0
      ? String(rawId)
      : typeof rawId === "string" && rawId.trim()
        ? rawId.trim()
        : null;
  const externalId = value.external_id;
  const status = value.status;

  if (!id) throw new TypeError("Expected a Printful order ID.");
  if (
    externalId !== null &&
    externalId !== undefined &&
    typeof externalId !== "string"
  ) {
    throw new TypeError("Expected a Printful external order ID.");
  }
  if (typeof status !== "string" || !status.trim()) {
    throw new TypeError("Expected a Printful order status.");
  }

  return {
    id,
    externalId:
      typeof externalId === "string" && externalId.trim()
        ? externalId.trim()
        : null,
    status: status.trim().toLowerCase(),
  };
}

function assertOrderId(orderId: string): void {
  if (!UUID_PATTERN.test(orderId)) {
    throw new PrintfulFulfillmentError(
      "validation",
      "A valid Supabase order ID is required.",
    );
  }
}

async function loadFulfillmentOrder(
  orderId: string,
): Promise<LoadedFulfillmentOrder> {
  assertOrderId(orderId);
  const supabase = getSupabaseAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new PrintfulFulfillmentError(
      "persistence",
      "Unable to load the order for fulfillment.",
    );
  }
  if (!order) {
    throw new PrintfulFulfillmentError("not_found", "Order not found.");
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError || !items) {
    throw new PrintfulFulfillmentError(
      "persistence",
      "Unable to load the order items for fulfillment.",
    );
  }

  return { order, items };
}

function isAttemptStale(order: DatabaseOrder): boolean {
  if (order.fulfillment_status !== "pending") return false;
  const attemptedAt = order.printful_last_attempt_at
    ? Date.parse(order.printful_last_attempt_at)
    : Number.NaN;
  return !Number.isFinite(attemptedAt) || Date.now() - attemptedAt >= ATTEMPT_LEASE_MS;
}

function canClaim(order: DatabaseOrder): boolean {
  return (
    order.fulfillment_status === "not_started" ||
    order.fulfillment_status === "failed" ||
    isAttemptStale(order)
  );
}

function hasValidSyncVariants(items: readonly DatabaseOrderItem[]): boolean {
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        Number.isSafeInteger(item.printful_sync_variant_id) &&
        (item.printful_sync_variant_id ?? 0) > 0 &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0,
    )
  );
}

export async function getPrintfulFulfillmentReadiness(
  orderId: string,
): Promise<PrintfulFulfillmentReadiness> {
  const { order, items } = await loadFulfillmentOrder(orderId);
  const hasShippingAddress = order.shipping_address !== null;
  const hasValidShippingRecipient = hasValidPrintfulRecipient(order);
  const allItemsHavePrintfulSyncVariantIds = hasValidSyncVariants(items);
  const alreadyHasPrintfulOrder = order.printful_order_id !== null;
  const attemptInProgress =
    order.fulfillment_status === "pending" && !isAttemptStale(order);
  const expectedExternalId = getPrintfulExternalId(order.id);

  return {
    eligible:
      order.status === "paid" &&
      order.payment_status === "paid" &&
      !alreadyHasPrintfulOrder &&
      !attemptInProgress &&
      canClaim(order) &&
      hasValidShippingRecipient &&
      allItemsHavePrintfulSyncVariantIds &&
      (!order.printful_external_id ||
        order.printful_external_id === expectedExternalId),
    orderId: order.id,
    paymentStatus: order.payment_status,
    orderStatus: order.status,
    fulfillmentStatus: order.fulfillment_status,
    hasShippingAddress,
    hasValidShippingRecipient,
    itemCount: items.length,
    allItemsHavePrintfulSyncVariantIds,
    alreadyHasPrintfulOrder,
    attemptInProgress,
  };
}

function safeFulfillmentError(error: unknown): PrintfulFulfillmentError {
  if (error instanceof PrintfulFulfillmentError) return error;

  if (error instanceof PrintfulFulfillmentValidationError) {
    return new PrintfulFulfillmentError("validation", error.message);
  }

  if (error instanceof PrintfulConfigurationError) {
    return new PrintfulFulfillmentError(
      "configuration",
      "Printful fulfillment is not configured.",
    );
  }

  if (error instanceof PrintfulApiError) {
    const status = error.status ? ` (HTTP ${error.status})` : "";
    return new PrintfulFulfillmentError(
      "provider",
      `Printful draft creation failed${status}: ${error.message}`.slice(
        0,
        MAX_ERROR_LENGTH,
      ),
    );
  }

  return new PrintfulFulfillmentError(
    "provider",
    "Printful draft creation failed.",
  );
}

async function recordFulfillmentFailure(
  orderId: string,
  externalId: string,
  error: PrintfulFulfillmentError,
  printfulStatus: string | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  const { error: updateError } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      fulfillment_status: "failed",
      printful_external_id: externalId,
      printful_status: printfulStatus,
      printful_last_error: error.message.slice(0, MAX_ERROR_LENGTH),
      printful_last_attempt_at: now,
    })
    .eq("id", orderId)
    .is("printful_order_id", null)
    .neq("fulfillment_status", "draft_created");

  if (updateError) {
    throw new PrintfulFulfillmentError(
      "persistence",
      "Unable to persist the Printful fulfillment failure.",
    );
  }
}

async function claimFulfillmentAttempt(
  order: DatabaseOrder,
  externalId: string,
): Promise<DatabaseOrder | null> {
  const attemptedAt = new Date().toISOString();
  let query = getSupabaseAdminClient()
    .from("orders")
    .update({
      fulfillment_status: "pending",
      printful_external_id: externalId,
      printful_last_attempt_at: attemptedAt,
      printful_last_error: null,
    })
    .eq("id", order.id)
    .eq("status", "paid")
    .eq("payment_status", "paid")
    .eq("fulfillment_status", order.fulfillment_status)
    .is("printful_order_id", null);

  if (order.printful_last_attempt_at) {
    query = query.eq(
      "printful_last_attempt_at",
      order.printful_last_attempt_at,
    );
  } else {
    query = query.is("printful_last_attempt_at", null);
  }

  const { data, error } = await query.select("*").maybeSingle();
  if (error) {
    throw new PrintfulFulfillmentError(
      "persistence",
      "Unable to claim the Printful fulfillment attempt.",
    );
  }
  return data;
}

async function persistCreatedDraft(
  orderId: string,
  externalId: string,
  printfulOrder: PrintfulOrderResponse,
): Promise<DatabaseOrder> {
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      fulfillment_status: "draft_created",
      printful_order_id: printfulOrder.id,
      printful_external_id: externalId,
      printful_status: printfulOrder.status,
      printful_last_error: null,
      printful_draft_created_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "paid")
    .eq("payment_status", "paid")
    .eq("fulfillment_status", "pending")
    .eq("printful_external_id", externalId)
    .is("printful_order_id", null)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new PrintfulFulfillmentError(
      "persistence",
      "Unable to persist the Printful draft order.",
    );
  }
  return data;
}

function existingResult(order: DatabaseOrder): PrintfulDraftCreationResult {
  return {
    outcome: "already_created",
    orderId: order.id,
    fulfillmentStatus: order.fulfillment_status,
    printfulOrderId: order.printful_order_id,
    printfulExternalId:
      order.printful_external_id ?? getPrintfulExternalId(order.id),
    printfulStatus: order.printful_status,
  };
}

export async function createPrintfulDraftOrder(
  orderId: string,
): Promise<PrintfulDraftCreationResult> {
  const loaded = await loadFulfillmentOrder(orderId);
  const { order, items } = loaded;
  const externalId = getPrintfulExternalId(order.id);

  if (order.status !== "paid" || order.payment_status !== "paid") {
    throw new PrintfulFulfillmentError(
      "ineligible",
      "Only a verified paid order can create a Printful draft.",
    );
  }

  if (order.printful_order_id) return existingResult(order);

  if (
    order.printful_external_id &&
    order.printful_external_id !== externalId
  ) {
    const error = new PrintfulFulfillmentError(
      "validation",
      "The order has a conflicting Printful external ID.",
    );
    await recordFulfillmentFailure(order.id, externalId, error);
    throw error;
  }

  let payload;
  try {
    payload = buildPrintfulDraftOrderPayload(order, items);
  } catch (error) {
    const safeError = safeFulfillmentError(error);
    await recordFulfillmentFailure(order.id, externalId, safeError);
    throw safeError;
  }

  if (!canClaim(order)) {
    if (order.fulfillment_status === "pending") {
      return {
        outcome: "in_progress",
        orderId: order.id,
        fulfillmentStatus: order.fulfillment_status,
        printfulOrderId: null,
        printfulExternalId: externalId,
        printfulStatus: order.printful_status,
      };
    }
    throw new PrintfulFulfillmentError(
      "ineligible",
      "The order is not eligible for a Printful draft attempt.",
    );
  }

  const claimedOrder = await claimFulfillmentAttempt(order, externalId);
  if (!claimedOrder) {
    const latest = (await loadFulfillmentOrder(order.id)).order;
    if (latest.printful_order_id) return existingResult(latest);
    if (latest.fulfillment_status === "pending") {
      return {
        outcome: "in_progress",
        orderId: latest.id,
        fulfillmentStatus: latest.fulfillment_status,
        printfulOrderId: null,
        printfulExternalId: externalId,
        printfulStatus: latest.printful_status,
      };
    }
    throw new PrintfulFulfillmentError(
      "ineligible",
      "The fulfillment state changed before the attempt was claimed.",
    );
  }

  let returnedStatus: string | null = null;
  try {
    const response = await printfulRequest("/orders", {
      method: "POST",
      query: { update_existing: true },
      body: payload,
      parseResult: parsePrintfulOrder,
    });
    const printfulOrder = response.result;
    returnedStatus = printfulOrder.status;

    if (printfulOrder.externalId !== externalId) {
      throw new PrintfulFulfillmentError(
        "provider",
        "Printful returned a mismatched external order ID.",
      );
    }
    if (printfulOrder.status !== "draft") {
      throw new PrintfulFulfillmentError(
        "provider",
        `Printful returned an unexpected non-draft status: ${printfulOrder.status}.`,
      );
    }

    const persistedOrder = await persistCreatedDraft(
      order.id,
      externalId,
      printfulOrder,
    );
    return {
      outcome: "draft_created",
      orderId: persistedOrder.id,
      fulfillmentStatus: persistedOrder.fulfillment_status,
      printfulOrderId: persistedOrder.printful_order_id,
      printfulExternalId: externalId,
      printfulStatus: persistedOrder.printful_status,
    };
  } catch (error) {
    const safeError = safeFulfillmentError(error);
    await recordFulfillmentFailure(
      order.id,
      externalId,
      safeError,
      returnedStatus,
    );
    throw safeError;
  }
}

export function safePrintfulFulfillmentErrorMessage(error: unknown): string {
  return safeFulfillmentError(error).message;
}
