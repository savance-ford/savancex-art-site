export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type OrderStatus =
  | "checkout_pending"
  | "checkout_created"
  | "paid"
  | "payment_failed"
  | "expired"
  | "payment_review"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "processing" | "failed";

export type FulfillmentStatus =
  | "not_started"
  | "pending"
  | "draft_created"
  | "submitted"
  | "failed"
  | "fulfilled";

export type StripeWebhookEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "ignored"
  | "failed";

export type DatabaseOrder = {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  shipping_method_id: string | null;
  shipping_method_name: string | null;
  shipping_min_delivery_days: number | null;
  shipping_max_delivery_days: number | null;
  shipping_min_delivery_date: string | null;
  shipping_max_delivery_date: string | null;
  shipping_rate_quoted_at: string | null;
  tax_cents: number;
  total_cents: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  stripe_tax_status: string | null;
  stripe_tax_calculation_id: string | null;
  stripe_tax_transaction_id: string | null;
  stripe_tax_collected_at: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: JsonValue | null;
  printful_order_id: string | null;
  printful_external_id: string | null;
  printful_status: string | null;
  printful_last_error: string | null;
  printful_last_attempt_at: string | null;
  printful_draft_created_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DatabaseOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  storefront_product_id: string;
  storefront_variant_id: string;
  printful_sync_product_id: number | null;
  printful_sync_variant_id: number | null;
  printful_catalog_variant_id: number | null;
  product_name: string;
  variant_name: string | null;
  color: string | null;
  size: string | null;
  sku: string | null;
  unit_amount_cents: number;
  quantity: number;
  line_total_cents: number;
  image_url: string | null;
  metadata: JsonValue;
  created_at: string;
};

export type StripeWebhookEventRecord = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  livemode: boolean;
  status: StripeWebhookEventStatus;
  checkout_session_id: string | null;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
};

export type CreateOrderItemInput = {
  product_id?: string | null;
  product_variant_id?: string | null;
  storefront_product_id: string;
  storefront_variant_id: string;
  printful_sync_product_id?: number | null;
  printful_sync_variant_id?: number | null;
  printful_catalog_variant_id?: number | null;
  product_name: string;
  variant_name?: string | null;
  color?: string | null;
  size?: string | null;
  sku?: string | null;
  unit_amount_cents: number;
  quantity: number;
  line_total_cents: number;
  image_url?: string | null;
  metadata?: JsonValue;
};

export type CreateOrderInput = {
  currency?: string;
  subtotal_cents: number;
  shipping_cents?: number;
  shipping_address?: JsonValue | null;
  shipping_method_id?: string | null;
  shipping_method_name?: string | null;
  shipping_min_delivery_days?: number | null;
  shipping_max_delivery_days?: number | null;
  shipping_min_delivery_date?: string | null;
  shipping_max_delivery_date?: string | null;
  shipping_rate_quoted_at?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  tax_cents?: number;
  total_cents: number;
  items: CreateOrderItemInput[];
};

export type OrderWithItems = DatabaseOrder & {
  items: DatabaseOrderItem[];
};
