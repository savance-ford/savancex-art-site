import type {
  CommerceProduct,
  CommerceVariant,
} from "@/lib/commerce/types";

export interface CatalogProvider {
  listProducts(): Promise<readonly CommerceProduct[]>;
  getProduct(slug: string): Promise<CommerceProduct | null>;
  getProductVariants(productId: string): Promise<readonly CommerceVariant[]>;
  /** Returns null when inventory is not quantity-tracked. */
  getInventory(variantId: string): Promise<number | null>;
}

export { catalogProvider } from "@/lib/commerce/provider-selection";
