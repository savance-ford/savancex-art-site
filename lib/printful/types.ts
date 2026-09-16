export type PrintfulStore = {
  id: number;
  type: string;
  name: string;
};

export type PrintfulSyncProductSummary = {
  id: number;
  external_id: string | null;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string | null;
  is_ignored: boolean;
};

export type PrintfulFile = {
  id: number | null;
  type: string;
  url: string | null;
  filename: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
};

export type PrintfulVariantProduct = {
  variant_id: number;
  product_id: number;
  image: string | null;
  name: string;
};

export type PrintfulSyncVariant = {
  id: number;
  external_id: string | null;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  availability_status: string | null;
  files: PrintfulFile[];
  product: PrintfulVariantProduct | null;
};

export type PrintfulSyncProduct = {
  sync_product: PrintfulSyncProductSummary;
  sync_variants: PrintfulSyncVariant[];
};

export type PrintfulPaging = {
  total: number;
  offset: number;
  limit: number;
};

export type PrintfulApiResponse<T> = {
  code: number;
  result: T;
  paging?: PrintfulPaging;
  extra?: unknown;
};
