import "server-only";

import { printfulRequest } from "@/lib/printful/client";
import { PrintfulApiError } from "@/lib/printful/errors";
import type {
  PrintfulFile,
  PrintfulStore,
  PrintfulSyncProduct,
  PrintfulSyncProductSummary,
  PrintfulSyncVariant,
  PrintfulVariantProduct,
} from "@/lib/printful/types";

const PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = 1_000;

type ProviderRecord = Record<string, unknown>;

function asRecord(value: unknown): ProviderRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Expected a provider object.");
  }
  return value as ProviderRecord;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError("Expected a provider array.");
  return value;
}

function numberField(record: ProviderRecord, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Expected numeric field: ${key}.`);
  }
  return value;
}

function stringField(record: ProviderRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new TypeError(`Expected string field: ${key}.`);
  }
  return value;
}

function nullableStringField(record: ProviderRecord, key: string): string | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new TypeError(`Expected nullable string field: ${key}.`);
  }
  return value;
}

function booleanField(record: ProviderRecord, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new TypeError(`Expected boolean field: ${key}.`);
  }
  return value;
}

function parseStore(value: unknown): PrintfulStore {
  const store = asRecord(value);
  return {
    id: numberField(store, "id"),
    type: stringField(store, "type"),
    name: stringField(store, "name"),
  };
}

function parseSyncProductSummary(value: unknown): PrintfulSyncProductSummary {
  const product = asRecord(value);
  return {
    id: numberField(product, "id"),
    external_id: nullableStringField(product, "external_id"),
    name: stringField(product, "name"),
    variants: numberField(product, "variants"),
    synced: numberField(product, "synced"),
    thumbnail_url: nullableStringField(product, "thumbnail_url"),
    is_ignored: booleanField(product, "is_ignored"),
  };
}

function parseFile(value: unknown): PrintfulFile {
  const file = asRecord(value);
  const fileId = file.id;

  if (fileId !== undefined && fileId !== null && typeof fileId !== "number") {
    throw new TypeError("Expected nullable numeric field: id.");
  }

  return {
    id: typeof fileId === "number" ? fileId : null,
    type: stringField(file, "type"),
    url: nullableStringField(file, "url"),
    filename: nullableStringField(file, "filename"),
    thumbnail_url: nullableStringField(file, "thumbnail_url"),
    preview_url: nullableStringField(file, "preview_url"),
  };
}

function parseVariantProduct(value: unknown): PrintfulVariantProduct | null {
  if (value === undefined || value === null) return null;

  const product = asRecord(value);
  return {
    variant_id: numberField(product, "variant_id"),
    product_id: numberField(product, "product_id"),
    image: nullableStringField(product, "image"),
    name: stringField(product, "name"),
  };
}

function parseSyncVariant(value: unknown): PrintfulSyncVariant {
  const variant = asRecord(value);
  return {
    id: numberField(variant, "id"),
    external_id: nullableStringField(variant, "external_id"),
    sync_product_id: numberField(variant, "sync_product_id"),
    name: stringField(variant, "name"),
    synced: booleanField(variant, "synced"),
    variant_id: numberField(variant, "variant_id"),
    retail_price: stringField(variant, "retail_price"),
    sku: nullableStringField(variant, "sku"),
    size: nullableStringField(variant, "size"),
    color: nullableStringField(variant, "color"),
    availability_status: nullableStringField(variant, "availability_status"),
    files: asArray(variant.files).map(parseFile),
    product: parseVariantProduct(variant.product),
  };
}

function parseStores(value: unknown): PrintfulStore[] {
  return asArray(value).map(parseStore);
}

function parseProductSummaries(value: unknown): PrintfulSyncProductSummary[] {
  return asArray(value).map(parseSyncProductSummary);
}

function parseSyncProduct(value: unknown): PrintfulSyncProduct {
  const result = asRecord(value);
  return {
    sync_product: parseSyncProductSummary(result.sync_product),
    sync_variants: asArray(result.sync_variants).map(parseSyncVariant),
  };
}

function invalidPagingError(): PrintfulApiError {
  return new PrintfulApiError({
    kind: "invalid_response",
    message: "Printful returned invalid product paging information.",
    status: 200,
  });
}

export async function getPrintfulStores(): Promise<PrintfulStore[]> {
  const response = await printfulRequest("/stores", {
    parseResult: parseStores,
  });
  return response.result;
}

export async function getPrintfulProducts(): Promise<
  PrintfulSyncProductSummary[]
> {
  const products: PrintfulSyncProductSummary[] = [];
  const seenOffsets = new Set<number>();
  let offset = 0;

  for (let page = 0; page < MAX_PRODUCT_PAGES; page += 1) {
    const response = await printfulRequest("/store/products", {
      query: { offset, limit: PAGE_SIZE },
      parseResult: parseProductSummaries,
    });
    const paging = response.paging;

    if (
      !paging ||
      paging.offset !== offset ||
      seenOffsets.has(paging.offset)
    ) {
      throw invalidPagingError();
    }

    seenOffsets.add(paging.offset);
    products.push(...response.result);

    const nextOffset = paging.offset + paging.limit;
    if (nextOffset >= paging.total) return products;
    if (nextOffset <= paging.offset) throw invalidPagingError();

    offset = nextOffset;
  }

  throw new PrintfulApiError({
    kind: "invalid_response",
    message: "Printful product paging exceeded the safety limit.",
    status: 200,
  });
}

export async function getPrintfulProduct(
  id: number | string,
): Promise<PrintfulSyncProduct> {
  const productId = String(id).trim();
  if (!productId) throw new TypeError("A Printful product ID is required.");

  const response = await printfulRequest(
    `/store/products/${encodeURIComponent(productId)}`,
    { parseResult: parseSyncProduct },
  );
  return response.result;
}
