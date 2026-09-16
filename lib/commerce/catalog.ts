import "server-only";

import { cache } from "react";

import { collections } from "@/data/collections";
import { catalogProvider } from "@/lib/commerce/catalog-provider";
import type {
  CatalogProduct,
  CommerceVariant,
} from "@/lib/commerce/types";
import type {
  ProductCategory,
  ProductCollection,
} from "@/types/commerce";

const CATEGORY_NAME_BY_SLUG = {
  "t-shirts": "T-Shirts",
  hoodies: "Hoodies",
  crewnecks: "Crewnecks",
} as const satisfies Readonly<Record<string, ProductCategory>>;

export type ProductCategorySlug = keyof typeof CATEGORY_NAME_BY_SLUG;

const readCatalogProducts = cache(
  async (): Promise<readonly CatalogProduct[]> => {
    const products = await catalogProvider.listProducts();
    const variants = await Promise.all(
      products.map((product) => catalogProvider.getProductVariants(product.id)),
    );

    return Object.freeze(
      products.map((product, index) =>
        Object.freeze({
          ...product,
          variants: Object.freeze([...(variants[index] ?? [])]),
        }),
      ),
    );
  },
);

export async function getAllProducts(): Promise<readonly CatalogProduct[]> {
  return readCatalogProducts();
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | undefined> {
  return (await readCatalogProducts()).find((product) => product.slug === slug);
}

export async function getProductsByCategory(
  category: ProductCategory,
): Promise<readonly CatalogProduct[]> {
  return (await readCatalogProducts()).filter(
    (product) => product.category === category,
  );
}

export function getCollectionBySlug(
  slug: string,
): ProductCollection | undefined {
  return collections.find((collection) => collection.slug === slug);
}

export async function getProductsByCollection(
  collectionName: ProductCollection["name"],
): Promise<readonly CatalogProduct[]> {
  return (await readCatalogProducts()).filter(
    (product) => product.collection === collectionName,
  );
}

export async function getRelatedProducts(
  product: CatalogProduct,
  limit: number,
): Promise<readonly CatalogProduct[]> {
  return (await readCatalogProducts())
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        (candidate.category === product.category ||
          candidate.collection === product.collection),
    )
    .slice(0, limit);
}

export async function getFeaturedProducts(): Promise<readonly CatalogProduct[]> {
  return (await readCatalogProducts())
    .filter((product) => product.featured)
    .slice(0, 6);
}

export async function getCapsuleProducts(): Promise<readonly CatalogProduct[]> {
  return (await readCatalogProducts())
    .filter((product) => !product.featured)
    .slice(0, 6);
}

export async function getCoreProducts(): Promise<readonly CatalogProduct[]> {
  return readCatalogProducts();
}

export async function getProductVariants(
  productId: string,
): Promise<readonly CommerceVariant[]> {
  return catalogProvider.getProductVariants(productId);
}

export async function getInventory(variantId: string): Promise<number | null> {
  return catalogProvider.getInventory(variantId);
}

export function isValidCategorySlug(
  slug: string,
): slug is ProductCategorySlug {
  return Object.hasOwn(CATEGORY_NAME_BY_SLUG, slug);
}

export function categorySlugToName(
  slug: ProductCategorySlug,
): ProductCategory;
export function categorySlugToName(slug: string): ProductCategory | undefined;
export function categorySlugToName(slug: string): ProductCategory | undefined {
  return isValidCategorySlug(slug) ? CATEGORY_NAME_BY_SLUG[slug] : undefined;
}
