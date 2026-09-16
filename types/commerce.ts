import type { CommercePrice } from "@/lib/commerce/types";

export type ProductCategory = "T-Shirts" | "Hoodies" | "Crewnecks";

export type ProductSize = "S" | "M" | "L" | "XL" | "2XL" | "3XL";

export interface Brand {
  readonly name: string;
  readonly tagline: string;
  readonly shippingThreshold: number;
}

export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly collection: string;
  readonly price: number;
  readonly compareAt: number;
  readonly badge: string;
  readonly rating: number;
  readonly reviews: number;
  readonly colors: readonly string[];
  readonly sizes: readonly ProductSize[];
  readonly image: string;
  readonly altImage: string;
  readonly summary: string;
  readonly features: readonly string[];
  readonly fit: string;
  readonly soldOut: boolean;
}

export interface ProductCollection {
  readonly slug: string;
  readonly name: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly image: string;
}

export interface ProductReview {
  readonly name: string;
  readonly title: string;
  readonly body: string;
  readonly rating: number;
  readonly product: string;
}

export interface CartLine {
  /** Storefront-owned product and variant identifiers. */
  productId: string;
  variantId: string;
  printfulSyncVariantId: string | null;
  printfulCatalogVariantId: string | null;
  color: string;
  size: string;
  quantity: number;
  /** Display-only snapshot. Checkout must re-resolve price on the server. */
  displayPrice: CommercePrice;
}

export type CartLineKey = `${string}::${string}`;

export type SortOption = "featured" | "price-asc" | "price-desc" | "name";

export interface CatalogFilterState {
  readonly categories: readonly ProductCategory[];
  readonly availableOnly: boolean;
  readonly under50: boolean;
}

export interface ProductOptionSelection {
  readonly color: string;
  readonly size: string;
}
