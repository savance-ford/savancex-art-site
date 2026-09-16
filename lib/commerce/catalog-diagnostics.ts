import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 1_000;
const MAX_PAGES = 1_000;

export type DiagnosticProductReference = {
  id: string;
  slug: string;
};

export type DiagnosticVariantReference = {
  id: string;
  productId: string;
};

export type CatalogDiagnostics = {
  generatedAt: string;
  totalDatabaseProducts: number;
  activeDatabaseProducts: number;
  totalVariants: number;
  activeVariants: number;
  productsWithZeroVariants: DiagnosticProductReference[];
  productsWithoutPrintfulIds: DiagnosticProductReference[];
  variantsWithoutPrintfulIds: Array<
    DiagnosticVariantReference & {
      missing: Array<"syncVariantId" | "catalogVariantId">;
    }
  >;
  productsWithoutImages: DiagnosticProductReference[];
  duplicateSlugs: Array<{
    slug: string;
    count: number;
    productIds: string[];
  }>;
  variantsMissingPrice: DiagnosticVariantReference[];
  variantsMissingSizeOrColor: Array<
    DiagnosticVariantReference & {
      missing: Array<"size" | "color">;
    }
  >;
  mostRecentPrintfulSyncRun: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    productsReceived: number;
    productsUpserted: number;
    variantsReceived: number;
    variantsUpserted: number;
  } | null;
  lastSuccessfulPrintfulSyncTime: string | null;
};

export class CatalogDiagnosticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogDiagnosticsError";
  }
}

async function loadProducts() {
  const supabase = getSupabaseAdminClient();
  const rows = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, active, printful_sync_product_id")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new CatalogDiagnosticsError(
        "Unable to read products for catalog diagnostics.",
      );
    }

    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }

  throw new CatalogDiagnosticsError(
    "Product diagnostics exceeded the pagination safety limit.",
  );
}

async function loadVariants() {
  const supabase = getSupabaseAdminClient();
  const rows = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        "id, product_id, active, printful_sync_variant_id, printful_catalog_variant_id, retail_price, size, color",
      )
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new CatalogDiagnosticsError(
        "Unable to read variants for catalog diagnostics.",
      );
    }

    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }

  throw new CatalogDiagnosticsError(
    "Variant diagnostics exceeded the pagination safety limit.",
  );
}

async function loadImageProductIds(): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const productIds = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("product_images")
      .select("product_id")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new CatalogDiagnosticsError(
        "Unable to read images for catalog diagnostics.",
      );
    }

    for (const image of data ?? []) productIds.add(image.product_id);
    if ((data?.length ?? 0) < PAGE_SIZE) return productIds;
  }

  throw new CatalogDiagnosticsError(
    "Image diagnostics exceeded the pagination safety limit.",
  );
}

async function loadSyncState() {
  const supabase = getSupabaseAdminClient();
  const [latestResponse, successfulResponse] = await Promise.all([
    supabase
      .from("printful_sync_runs")
      .select(
        "id, status, started_at, completed_at, products_received, products_upserted, variants_received, variants_upserted",
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("printful_sync_runs")
      .select("completed_at")
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (latestResponse.error || successfulResponse.error) {
    throw new CatalogDiagnosticsError(
      "Unable to read Printful synchronization history.",
    );
  }

  return {
    latest: latestResponse.data,
    lastSuccessfulTime: successfulResponse.data?.completed_at ?? null,
  };
}

function productReference(product: {
  id: string;
  slug: string;
}): DiagnosticProductReference {
  return { id: product.id, slug: product.slug };
}

function variantReference(variant: {
  id: string;
  product_id: string;
}): DiagnosticVariantReference {
  return { id: variant.id, productId: variant.product_id };
}

export async function getCatalogDiagnostics(): Promise<CatalogDiagnostics> {
  const [products, variants, imageProductIds, syncState] = await Promise.all([
    loadProducts(),
    loadVariants(),
    loadImageProductIds(),
    loadSyncState(),
  ]);

  const variantCountsByProduct = new Map<string, number>();
  for (const variant of variants) {
    variantCountsByProduct.set(
      variant.product_id,
      (variantCountsByProduct.get(variant.product_id) ?? 0) + 1,
    );
  }

  const productsBySlug = new Map<string, string[]>();
  for (const product of products) {
    const productIds = productsBySlug.get(product.slug) ?? [];
    productIds.push(product.id);
    productsBySlug.set(product.slug, productIds);
  }

  const variantsMissingPrice = variants
    .filter((variant) => {
      const price: unknown = variant.retail_price;
      return typeof price !== "number" || !Number.isFinite(price);
    })
    .map(variantReference);

  const variantsMissingSizeOrColor = variants.flatMap((variant) => {
    const missing: Array<"size" | "color"> = [];
    if (!variant.size?.trim()) missing.push("size");
    if (!variant.color?.trim()) missing.push("color");

    return missing.length > 0
      ? [{ ...variantReference(variant), missing }]
      : [];
  });

  const mostRecentRun = syncState.latest;

  return {
    generatedAt: new Date().toISOString(),
    totalDatabaseProducts: products.length,
    activeDatabaseProducts: products.filter(({ active }) => active).length,
    totalVariants: variants.length,
    activeVariants: variants.filter(({ active }) => active).length,
    productsWithZeroVariants: products
      .filter(({ id }) => !variantCountsByProduct.has(id))
      .map(productReference),
    productsWithoutPrintfulIds: products
      .filter(({ printful_sync_product_id }) => printful_sync_product_id === null)
      .map(productReference),
    variantsWithoutPrintfulIds: variants.flatMap((variant) => {
      const missing: Array<"syncVariantId" | "catalogVariantId"> = [];
      if (variant.printful_sync_variant_id === null) {
        missing.push("syncVariantId");
      }
      if (variant.printful_catalog_variant_id === null) {
        missing.push("catalogVariantId");
      }

      return missing.length > 0
        ? [{ ...variantReference(variant), missing }]
        : [];
    }),
    productsWithoutImages: products
      .filter(({ id }) => !imageProductIds.has(id))
      .map(productReference),
    duplicateSlugs: [...productsBySlug.entries()]
      .filter(([, productIds]) => productIds.length > 1)
      .map(([slug, productIds]) => ({
        slug,
        count: productIds.length,
        productIds,
      })),
    variantsMissingPrice,
    variantsMissingSizeOrColor,
    mostRecentPrintfulSyncRun: mostRecentRun
      ? {
          id: mostRecentRun.id,
          status: mostRecentRun.status,
          startedAt: mostRecentRun.started_at,
          completedAt: mostRecentRun.completed_at,
          productsReceived: mostRecentRun.products_received,
          productsUpserted: mostRecentRun.products_upserted,
          variantsReceived: mostRecentRun.variants_received,
          variantsUpserted: mostRecentRun.variants_upserted,
        }
      : null,
    lastSuccessfulPrintfulSyncTime: syncState.lastSuccessfulTime,
  };
}
