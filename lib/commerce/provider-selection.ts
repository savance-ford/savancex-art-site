import "server-only";

import type { CatalogProvider } from "@/lib/commerce/catalog-provider";
import { localCatalogProvider } from "@/lib/commerce/local-catalog-provider";
import { supabaseCatalogProvider } from "@/lib/commerce/supabase-catalog-provider";

const useDevelopmentFallback =
  process.env.NODE_ENV !== "production" &&
  process.env.COMMERCE_CATALOG_FALLBACK === "local";

class DevelopmentFallbackCatalogProvider implements CatalogProvider {
  async listProducts() {
    try {
      return await supabaseCatalogProvider.listProducts();
    } catch {
      return localCatalogProvider.listProducts();
    }
  }

  async getProduct(slug: string) {
    try {
      return await supabaseCatalogProvider.getProduct(slug);
    } catch {
      return localCatalogProvider.getProduct(slug);
    }
  }

  async getProductVariants(productId: string) {
    try {
      return await supabaseCatalogProvider.getProductVariants(productId);
    } catch {
      return localCatalogProvider.getProductVariants(productId);
    }
  }

  async getInventory(variantId: string) {
    try {
      return await supabaseCatalogProvider.getInventory(variantId);
    } catch {
      return localCatalogProvider.getInventory(variantId);
    }
  }
}

/** Supabase is authoritative unless an explicit local development fallback is enabled. */
export const catalogProvider: CatalogProvider = useDevelopmentFallback
  ? new DevelopmentFallbackCatalogProvider()
  : supabaseCatalogProvider;
