import "server-only";

import { unstable_cache } from "next/cache";

import { CatalogUnavailableError } from "@/lib/commerce/catalog-errors";
import type { CatalogProvider } from "@/lib/commerce/catalog-provider";
import type {
  CommercePrice,
  CommerceProduct,
  CommerceVariant,
} from "@/lib/commerce/types";
import { getSupabasePublicClient } from "@/lib/supabase/public";
import type {
  DatabaseProduct,
  DatabaseProductFeature,
  DatabaseProductImage,
  DatabaseProductVariant,
  Json,
} from "@/lib/supabase/types";

const PAGE_SIZE = 1_000;
const DEFAULT_REVALIDATE_SECONDS = 300;
const FALLBACK_PRIMARY_IMAGE = "/assets/products/signal-loss-front.svg";
const FALLBACK_ALTERNATE_IMAGE = "/assets/products/signal-loss-back.svg";
const UNAVAILABLE_STATUSES = new Set([
  "discontinued",
  "inactive",
  "out_of_stock",
  "unavailable",
]);

interface CatalogSnapshot {
  readonly products: readonly CommerceProduct[];
  readonly variants: readonly CommerceVariant[];
}

function getRevalidateSeconds(): number {
  const configured = Number(process.env.CATALOG_REVALIDATE_SECONDS);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : DEFAULT_REVALIDATE_SECONDS;
}

function catalogReadError(
  table: string,
  cause?: unknown,
): CatalogUnavailableError {
  return new CatalogUnavailableError(
    `The storefront catalog could not read ${table}.`,
    { cause },
  );
}

async function readProducts(): Promise<DatabaseProduct[]> {
  const client = getSupabasePublicClient();
  const rows: DatabaseProduct[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await client
      .from("products")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (response.error) throw catalogReadError("products", response.error);
    rows.push(...(response.data ?? []));
    if ((response.data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

async function readVariants(): Promise<DatabaseProductVariant[]> {
  const client = getSupabasePublicClient();
  const rows: DatabaseProductVariant[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await client
      .from("product_variants")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (response.error) {
      throw catalogReadError("product variants", response.error);
    }
    rows.push(...(response.data ?? []));
    if ((response.data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

async function readImages(): Promise<DatabaseProductImage[]> {
  const client = getSupabasePublicClient();
  const rows: DatabaseProductImage[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await client
      .from("product_images")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (response.error) throw catalogReadError("product images", response.error);
    rows.push(...(response.data ?? []));
    if ((response.data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

async function readFeatures(): Promise<DatabaseProductFeature[]> {
  const client = getSupabasePublicClient();
  const rows: DatabaseProductFeature[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await client
      .from("product_features")
      .select("*")
      .order("sort_order", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (response.error) {
      throw catalogReadError("product features", response.error);
    }
    rows.push(...(response.data ?? []));
    if ((response.data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function metadataNumber(metadata: Json, ...keys: string[]): number | null {
  if (!isJsonObject(metadata)) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return null;
}

function metadataString(metadata: Json, ...keys: string[]): string | null {
  if (!isJsonObject(metadata)) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function metadataStringArray(metadata: Json, key: string): readonly string[] {
  if (!isJsonObject(metadata)) return [];
  const value = metadata[key];
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) =>
    typeof item === "string" && item.trim() ? [item.trim()] : [],
  );
}

function toPrice(amount: number, currency: string): CommercePrice {
  return Object.freeze({
    amount: Math.round(amount * 100),
    currency: currency.trim().toUpperCase() || "USD",
  });
}

function inferCategory(product: DatabaseProduct): string {
  if (product.category?.trim()) return product.category.trim();

  const searchableName = product.name.toLowerCase();
  if (searchableName.includes("hoodie")) return "Hoodies";
  if (
    searchableName.includes("crewneck") ||
    searchableName.includes("sweatshirt")
  ) {
    return "Crewnecks";
  }
  if (searchableName.includes("t-shirt") || searchableName.includes("tee")) {
    return "T-Shirts";
  }

  return "Other";
}

function imageSourceRank(source: string): number {
  return source.toLowerCase() === "printful" ? 1 : 0;
}

function imageTypeRank(imageType: string): number {
  const normalized = imageType.toLowerCase();
  if (["primary", "front", "hero"].includes(normalized)) return 0;
  if (["alternate", "back"].includes(normalized)) return 2;
  return 1;
}

function orderedImages(
  product: DatabaseProduct,
  images: readonly DatabaseProductImage[],
): readonly string[] {
  const candidates = images
    .filter((image) => image.product_id === product.id && image.url.trim())
    .sort(
      (left, right) =>
        imageSourceRank(left.source) - imageSourceRank(right.source) ||
        imageTypeRank(left.image_type) - imageTypeRank(right.image_type) ||
        left.sort_order - right.sort_order,
    )
    .map((image) => image.url.trim());

  if (product.printful_thumbnail_url?.trim()) {
    candidates.push(product.printful_thumbnail_url.trim());
  }

  return Object.freeze([...new Set(candidates)]);
}

function isVariantAvailable(variant: DatabaseProductVariant): boolean {
  const status = variant.availability_status?.trim().toLowerCase();
  return variant.active && (!status || !UNAVAILABLE_STATUSES.has(status));
}

function normalizeVariant(
  row: DatabaseProductVariant,
  storefrontProductId: string,
  image: string,
): CommerceVariant {
  const color = row.color?.trim() || "Default";
  const size = row.size?.trim() || "One Size";

  return Object.freeze({
    id: row.storefront_variant_id,
    externalId: row.external_id,
    printfulSyncVariantId:
      row.printful_sync_variant_id === null
        ? null
        : String(row.printful_sync_variant_id),
    printfulCatalogVariantId:
      row.printful_catalog_variant_id === null
        ? null
        : String(row.printful_catalog_variant_id),
    productId: storefrontProductId,
    name: row.name?.trim() || `${color} / ${size}`,
    sku: row.sku,
    options: Object.freeze({ color, size }),
    price: toPrice(row.retail_price, row.currency),
    image,
    available: isVariantAvailable(row),
  });
}

function normalizeProduct(
  row: DatabaseProduct,
  variants: readonly CommerceVariant[],
  images: readonly DatabaseProductImage[],
  features: readonly DatabaseProductFeature[],
): CommerceProduct {
  const productImages = orderedImages(row, images);
  const fallbackPrimary = FALLBACK_PRIMARY_IMAGE;
  const image = productImages[0] ?? fallbackPrimary;
  const alternateImage =
    productImages[1] ??
    (image === fallbackPrimary ? FALLBACK_ALTERNATE_IMAGE : image);
  const availablePrices = variants
    .filter((variant) => variant.available)
    .map((variant) => variant.price);
  const prices = availablePrices.length
    ? availablePrices
    : variants.map((variant) => variant.price);
  const defaultPrice = prices.reduce<CommercePrice | null>((lowest, price) => {
    if (!lowest || price.amount < lowest.amount) return price;
    return lowest;
  }, null) ?? toPrice(0, "USD");
  const compareAtAmount = metadataNumber(
    row.metadata,
    "compareAtPrice",
    "compare_at_price",
  );
  const databaseFeatures = features
    .filter((feature) => feature.product_id === row.id)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((feature) => feature.feature.trim())
    .filter(Boolean);
  const normalizedFeatures = databaseFeatures.length
    ? databaseFeatures
    : metadataStringArray(row.metadata, "features");

  return Object.freeze({
    id: row.storefront_id,
    externalId:
      row.printful_sync_product_id === null
        ? row.printful_external_id
        : String(row.printful_sync_product_id),
    slug: row.slug,
    name: row.name,
    description:
      row.summary?.trim() ||
      row.description?.trim() ||
      `${row.name} by SAVANCEX.`,
    category: inferCategory(row),
    collection: row.collection_name?.trim() || "SAVANCEX",
    defaultPrice,
    compareAtPrice:
      compareAtAmount === null
        ? null
        : toPrice(compareAtAmount, defaultPrice.currency),
    image,
    alternateImage,
    badge: row.badge?.trim() || null,
    featured: row.featured,
    rating: metadataNumber(row.metadata, "rating") ?? 0,
    reviewCount:
      metadataNumber(row.metadata, "reviewCount", "review_count", "reviews") ?? 0,
    features: Object.freeze(normalizedFeatures),
    fit:
      metadataString(row.metadata, "fit") ||
      "See the size guide for detailed fit information.",
    available: variants.some((variant) => variant.available),
  });
}

async function loadCatalogSnapshot(): Promise<CatalogSnapshot> {
  try {
    const [productRows, variantRows, imageRows, featureRows] = await Promise.all([
      readProducts(),
      readVariants(),
      readImages(),
      readFeatures(),
    ]);
    const storefrontIdByDatabaseId = new Map(
      productRows.map((product) => [product.id, product.storefront_id] as const),
    );
    const primaryImageByDatabaseId = new Map(
      productRows.map((product) => [
        product.id,
        orderedImages(product, imageRows)[0] ?? FALLBACK_PRIMARY_IMAGE,
      ] as const),
    );
    const variants = variantRows.flatMap((variant) => {
      const storefrontProductId = storefrontIdByDatabaseId.get(
        variant.product_id,
      );
      if (!storefrontProductId) return [];

      return [
        normalizeVariant(
          variant,
          storefrontProductId,
          primaryImageByDatabaseId.get(variant.product_id) ??
            FALLBACK_PRIMARY_IMAGE,
        ),
      ];
    });
    const variantsByProductId = new Map<string, CommerceVariant[]>();

    for (const variant of variants) {
      const productVariants = variantsByProductId.get(variant.productId) ?? [];
      productVariants.push(variant);
      variantsByProductId.set(variant.productId, productVariants);
    }

    const products = productRows.map((product) =>
      normalizeProduct(
        product,
        variantsByProductId.get(product.storefront_id) ?? [],
        imageRows,
        featureRows,
      ),
    );

    return Object.freeze({
      products: Object.freeze(products),
      variants: Object.freeze(variants),
    });
  } catch (error) {
    if (error instanceof CatalogUnavailableError) throw error;
    throw new CatalogUnavailableError(undefined, { cause: error });
  }
}

const getCachedCatalogSnapshot = unstable_cache(
  loadCatalogSnapshot,
  ["supabase-storefront-catalog-v1"],
  {
    revalidate: getRevalidateSeconds(),
    tags: ["storefront-catalog"],
  },
);

class SupabaseCatalogProvider implements CatalogProvider {
  async listProducts(): Promise<readonly CommerceProduct[]> {
    return (await getCachedCatalogSnapshot()).products;
  }

  async getProduct(slug: string): Promise<CommerceProduct | null> {
    const { products } = await getCachedCatalogSnapshot();
    return products.find((product) => product.slug === slug) ?? null;
  }

  async getProductVariants(
    productId: string,
  ): Promise<readonly CommerceVariant[]> {
    const { variants } = await getCachedCatalogSnapshot();
    return variants.filter((variant) => variant.productId === productId);
  }

  async getInventory(variantId: string): Promise<number | null> {
    const { variants } = await getCachedCatalogSnapshot();
    const variant = variants.find((candidate) => candidate.id === variantId);
    if (!variant || !variant.available) return 0;
    return null;
  }
}

export const supabaseCatalogProvider: CatalogProvider =
  new SupabaseCatalogProvider();
