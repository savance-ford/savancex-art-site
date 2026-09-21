import type {
  DatabaseOrder,
  DatabaseOrderItem,
  FulfillmentStatus,
  JsonValue,
  OrderStatus,
  PaymentStatus,
  StripeWebhookEventRecord,
  StripeWebhookEventStatus,
} from "@/lib/orders/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DatabaseProduct = {
  id: string;
  storefront_id: string;
  slug: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  collection_name: string | null;
  badge: string | null;
  active: boolean;
  featured: boolean;
  sort_order: number;
  printful_sync_product_id: number | null;
  printful_external_id: string | null;
  printful_thumbnail_url: string | null;
  stripe_tax_code: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type DatabaseProductVariant = {
  id: string;
  product_id: string;
  storefront_variant_id: string;
  printful_sync_variant_id: number | null;
  printful_catalog_variant_id: number | null;
  external_id: string | null;
  sku: string | null;
  name: string | null;
  color: string | null;
  color_code: string | null;
  size: string | null;
  retail_price: number;
  currency: string;
  availability_status: string | null;
  active: boolean;
  sort_order: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type DatabaseProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  image_type: string;
  sort_order: number;
  source: string;
  created_at: string;
};

export type DatabaseProductFeature = {
  id: string;
  product_id: string;
  feature: string;
  sort_order: number;
};

export type PrintfulSyncRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  products_received: number;
  products_upserted: number;
  variants_received: number;
  variants_upserted: number;
  error_message: string | null;
  metadata: Json;
};

type DatabaseProductInsert = {
  id?: string;
  storefront_id: string;
  slug: string;
  name: string;
  description?: string | null;
  summary?: string | null;
  category?: string | null;
  collection_name?: string | null;
  badge?: string | null;
  active?: boolean;
  featured?: boolean;
  sort_order?: number;
  printful_sync_product_id?: number | null;
  printful_external_id?: string | null;
  printful_thumbnail_url?: string | null;
  stripe_tax_code?: string | null;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

type DatabaseProductVariantInsert = {
  id?: string;
  product_id: string;
  storefront_variant_id: string;
  printful_sync_variant_id?: number | null;
  printful_catalog_variant_id?: number | null;
  external_id?: string | null;
  sku?: string | null;
  name?: string | null;
  color?: string | null;
  color_code?: string | null;
  size?: string | null;
  retail_price: number;
  currency?: string;
  availability_status?: string | null;
  active?: boolean;
  sort_order?: number;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

type DatabaseProductImageInsert = {
  id?: string;
  product_id: string;
  url: string;
  alt_text?: string | null;
  image_type?: string;
  sort_order?: number;
  source?: string;
  created_at?: string;
};

type DatabaseProductFeatureInsert = {
  id?: string;
  product_id: string;
  feature: string;
  sort_order?: number;
};

type PrintfulSyncRunInsert = {
  id?: string;
  started_at?: string;
  completed_at?: string | null;
  status: string;
  products_received?: number;
  products_upserted?: number;
  variants_received?: number;
  variants_upserted?: number;
  error_message?: string | null;
  metadata?: Json;
};

type DatabaseOrderInsert = {
  id?: string;
  order_number?: number;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  currency?: string;
  subtotal_cents?: number;
  shipping_cents?: number;
  shipping_method_id?: string | null;
  shipping_method_name?: string | null;
  shipping_min_delivery_days?: number | null;
  shipping_max_delivery_days?: number | null;
  shipping_min_delivery_date?: string | null;
  shipping_max_delivery_date?: string | null;
  shipping_rate_quoted_at?: string | null;
  tax_cents?: number;
  total_cents?: number;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_tax_status?: string | null;
  stripe_tax_calculation_id?: string | null;
  stripe_tax_transaction_id?: string | null;
  stripe_tax_collected_at?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_address?: JsonValue | null;
  printful_order_id?: string | null;
  printful_external_id?: string | null;
  printful_status?: string | null;
  printful_last_error?: string | null;
  printful_last_attempt_at?: string | null;
  printful_draft_created_at?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type DatabaseOrderItemInsert = {
  id?: string;
  order_id: string;
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
  created_at?: string;
};

type StripeWebhookEventInsert = {
  id?: string;
  stripe_event_id: string;
  event_type: string;
  livemode: boolean;
  status?: StripeWebhookEventStatus;
  checkout_session_id?: string | null;
  error_message?: string | null;
  received_at?: string;
  processed_at?: string | null;
};

type ProductRelationship = {
  foreignKeyName: string;
  columns: ["product_id"];
  isOneToOne: false;
  referencedRelation: "products";
  referencedColumns: ["id"];
};

type OrderItemOrderRelationship = {
  foreignKeyName: "order_items_order_id_fkey";
  columns: ["order_id"];
  isOneToOne: false;
  referencedRelation: "orders";
  referencedColumns: ["id"];
};

type OrderItemProductRelationship = {
  foreignKeyName: "order_items_product_id_fkey";
  columns: ["product_id"];
  isOneToOne: false;
  referencedRelation: "products";
  referencedColumns: ["id"];
};

type OrderItemVariantRelationship = {
  foreignKeyName: "order_items_product_variant_id_fkey";
  columns: ["product_variant_id"];
  isOneToOne: false;
  referencedRelation: "product_variants";
  referencedColumns: ["id"];
};

export type Database = {
  public: {
    Tables: {
      products: {
        Row: DatabaseProduct;
        Insert: DatabaseProductInsert;
        Update: Partial<DatabaseProductInsert>;
        Relationships: [];
      };
      product_variants: {
        Row: DatabaseProductVariant;
        Insert: DatabaseProductVariantInsert;
        Update: Partial<DatabaseProductVariantInsert>;
        Relationships: [ProductRelationship];
      };
      product_images: {
        Row: DatabaseProductImage;
        Insert: DatabaseProductImageInsert;
        Update: Partial<DatabaseProductImageInsert>;
        Relationships: [ProductRelationship];
      };
      product_features: {
        Row: DatabaseProductFeature;
        Insert: DatabaseProductFeatureInsert;
        Update: Partial<DatabaseProductFeatureInsert>;
        Relationships: [ProductRelationship];
      };
      printful_sync_runs: {
        Row: PrintfulSyncRun;
        Insert: PrintfulSyncRunInsert;
        Update: Partial<PrintfulSyncRunInsert>;
        Relationships: [];
      };
      orders: {
        Row: DatabaseOrder;
        Insert: DatabaseOrderInsert;
        Update: Partial<DatabaseOrderInsert>;
        Relationships: [];
      };
      order_items: {
        Row: DatabaseOrderItem;
        Insert: DatabaseOrderItemInsert;
        Update: Partial<DatabaseOrderItemInsert>;
        Relationships: [
          OrderItemOrderRelationship,
          OrderItemProductRelationship,
          OrderItemVariantRelationship,
        ];
      };
      stripe_webhook_events: {
        Row: StripeWebhookEventRecord;
        Insert: StripeWebhookEventInsert;
        Update: Partial<StripeWebhookEventInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      begin_printful_catalog_sync: {
        Args: Record<string, never>;
        Returns: string;
      };
      apply_printful_catalog_sync: {
        Args: {
          p_sync_run_id: string;
          p_products: Json;
          p_variants: Json;
        };
        Returns: Json;
      };
    };
  };
};
