import "server-only";

import {
  PrintfulNormalizationError,
  normalizePrintfulProduct,
  normalizePrintfulVariant,
  type ExistingPrintfulProductIdentity,
  type ExistingPrintfulVariantIdentity,
  type NormalizedPrintfulProduct,
  type NormalizedPrintfulVariant,
} from "@/lib/commerce/printful-sync-normalization";
import {
  PrintfulApiError,
  PrintfulConfigurationError,
} from "@/lib/printful/errors";
import {
  getPrintfulProduct,
  getPrintfulProducts,
} from "@/lib/printful/products";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type PrintfulCatalogSyncResult = {
  syncRunId: string;
  productsReceived: number;
  productsUpserted: number;
  variantsReceived: number;
  variantsUpserted: number;
};

export class PrintfulSyncAlreadyRunningError extends Error {
  constructor() {
    super("A Printful catalog synchronization is already running.");
    this.name = "PrintfulSyncAlreadyRunningError";
  }
}

export class PrintfulSyncPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintfulSyncPersistenceError";
  }
}

type ExistingIdentityState = {
  productsByPrintfulId: Map<number, ExistingPrintfulProductIdentity>;
  variantsByPrintfulId: Map<number, ExistingPrintfulVariantIdentity>;
  reservedSlugs: Set<string>;
};

async function beginSyncRun(): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("begin_printful_catalog_sync");

  if (error) {
    if (
      error.code === "P0001" &&
      error.message.includes("printful_sync_already_running")
    ) {
      throw new PrintfulSyncAlreadyRunningError();
    }

    throw new PrintfulSyncPersistenceError(
      "Unable to create the Printful synchronization run.",
    );
  }

  if (typeof data !== "string" || !data) {
    throw new PrintfulSyncPersistenceError(
      "Supabase returned an invalid synchronization run ID.",
    );
  }

  return data;
}

async function updateSyncStatistics(
  syncRunId: string,
  statistics: {
    products_received?: number;
    variants_received?: number;
  },
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("printful_sync_runs")
    .update(statistics)
    .eq("id", syncRunId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new PrintfulSyncPersistenceError(
      "Unable to update Printful synchronization statistics.",
    );
  }
}

async function getExistingIdentityState(): Promise<ExistingIdentityState> {
  const supabase = getSupabaseAdminClient();
  const [productsResponse, variantsResponse] = await Promise.all([
    supabase
      .from("products")
      .select("storefront_id, slug, printful_sync_product_id"),
    supabase
      .from("product_variants")
      .select("storefront_variant_id, printful_sync_variant_id")
      .not("printful_sync_variant_id", "is", null),
  ]);

  if (productsResponse.error || variantsResponse.error) {
    throw new PrintfulSyncPersistenceError(
      "Unable to load existing catalog identities.",
    );
  }

  const productsByPrintfulId = new Map<
    number,
    ExistingPrintfulProductIdentity
  >();
  const reservedSlugs = new Set<string>();

  for (const product of productsResponse.data ?? []) {
    reservedSlugs.add(product.slug);
    if (product.printful_sync_product_id !== null) {
      productsByPrintfulId.set(product.printful_sync_product_id, {
        storefrontId: product.storefront_id,
        slug: product.slug,
      });
    }
  }

  const variantsByPrintfulId = new Map<
    number,
    ExistingPrintfulVariantIdentity
  >();

  for (const variant of variantsResponse.data ?? []) {
    if (variant.printful_sync_variant_id !== null) {
      variantsByPrintfulId.set(variant.printful_sync_variant_id, {
        storefrontVariantId: variant.storefront_variant_id,
      });
    }
  }

  return { productsByPrintfulId, variantsByPrintfulId, reservedSlugs };
}

async function applyNormalizedCatalog(
  syncRunId: string,
  products: NormalizedPrintfulProduct[],
  variants: NormalizedPrintfulVariant[],
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.rpc("apply_printful_catalog_sync", {
    p_sync_run_id: syncRunId,
    p_products: products,
    p_variants: variants,
  });

  if (error) {
    throw new PrintfulSyncPersistenceError(
      "Unable to apply the normalized Printful catalog.",
    );
  }
}

function getSafeSyncErrorMessage(error: unknown): string {
  if (error instanceof PrintfulApiError) {
    const status = error.status === null ? "" : ` (HTTP ${error.status})`;
    return `Printful request failed${status}: ${error.message}`.slice(0, 500);
  }

  if (
    error instanceof PrintfulConfigurationError ||
    error instanceof PrintfulNormalizationError ||
    error instanceof PrintfulSyncPersistenceError
  ) {
    return error.message.slice(0, 500);
  }

  return "Printful catalog synchronization failed.";
}

async function markSyncFailed(
  syncRunId: string,
  safeErrorMessage: string,
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("printful_sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: safeErrorMessage,
      })
      .eq("id", syncRunId)
      .eq("status", "running");

    if (!error) return;

    console.error(
      `Unable to mark Printful sync ${syncRunId} as failed (${error.code}).`,
    );
  } catch {
    console.error(`Unable to mark Printful sync ${syncRunId} as failed.`);
  }
}

export async function syncPrintfulCatalog(): Promise<PrintfulCatalogSyncResult> {
  const syncRunId = await beginSyncRun();
  console.info(`Printful sync started (${syncRunId}).`);

  try {
    const productSummaries = await getPrintfulProducts();
    await updateSyncStatistics(syncRunId, {
      products_received: productSummaries.length,
    });

    const productDetails = [];
    const seenProductIds = new Set<number>();
    let variantsReceived = 0;

    for (const summary of productSummaries) {
      if (seenProductIds.has(summary.id)) {
        throw new PrintfulNormalizationError(
          `Printful returned duplicate product ${summary.id}.`,
        );
      }
      seenProductIds.add(summary.id);

      const detail = await getPrintfulProduct(summary.id);
      if (detail.sync_product.id !== summary.id) {
        throw new PrintfulNormalizationError(
          `Printful returned mismatched detail for product ${summary.id}.`,
        );
      }

      productDetails.push(detail);
      variantsReceived += detail.sync_variants.length;
      await updateSyncStatistics(syncRunId, {
        variants_received: variantsReceived,
      });
    }

    const identityState = await getExistingIdentityState();
    const normalizedProducts: NormalizedPrintfulProduct[] = [];
    const normalizedVariants: NormalizedPrintfulVariant[] = [];
    const seenVariantIds = new Set<number>();

    for (const detail of productDetails) {
      const product = normalizePrintfulProduct(detail.sync_product, {
        existingIdentity: identityState.productsByPrintfulId.get(
          detail.sync_product.id,
        ),
        reservedSlugs: identityState.reservedSlugs,
      });
      normalizedProducts.push(product);

      for (const providerVariant of detail.sync_variants) {
        if (seenVariantIds.has(providerVariant.id)) {
          throw new PrintfulNormalizationError(
            `Printful returned duplicate variant ${providerVariant.id}.`,
          );
        }
        seenVariantIds.add(providerVariant.id);

        normalizedVariants.push(
          normalizePrintfulVariant(
            providerVariant,
            product,
            identityState.variantsByPrintfulId.get(providerVariant.id),
          ),
        );
      }
    }

    await applyNormalizedCatalog(
      syncRunId,
      normalizedProducts,
      normalizedVariants,
    );

    const result: PrintfulCatalogSyncResult = {
      syncRunId,
      productsReceived: normalizedProducts.length,
      productsUpserted: normalizedProducts.length,
      variantsReceived: normalizedVariants.length,
      variantsUpserted: normalizedVariants.length,
    };

    console.info(
      `Printful sync completed: ${result.productsUpserted} products, ${result.variantsUpserted} variants (${syncRunId}).`,
    );
    return result;
  } catch (error) {
    const safeErrorMessage = getSafeSyncErrorMessage(error);
    await markSyncFailed(syncRunId, safeErrorMessage);
    console.error(`Printful sync failed (${syncRunId}): ${safeErrorMessage}`);
    throw error;
  }
}
