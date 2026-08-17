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

type ProductRelationship = {
  foreignKeyName: string;
  columns: ["product_id"];
  isOneToOne: false;
  referencedRelation: "products";
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
