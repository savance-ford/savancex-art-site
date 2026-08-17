import { collections } from "@/data/collections";
import { products } from "@/data/products";
import type {
  Product,
  ProductCategory,
  ProductCollection,
} from "@/types/commerce";

const CATEGORY_NAME_BY_SLUG = {
  "t-shirts": "T-Shirts",
  hoodies: "Hoodies",
  crewnecks: "Crewnecks",
} as const satisfies Readonly<Record<string, ProductCategory>>;

export type ProductCategorySlug = keyof typeof CATEGORY_NAME_BY_SLUG;

export function getAllProducts(): readonly Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductsByCategory(
  category: ProductCategory,
): readonly Product[] {
  return products.filter((product) => product.category === category);
}

export function getCollectionBySlug(
  slug: string,
): ProductCollection | undefined {
  return collections.find((collection) => collection.slug === slug);
}

export function getProductsByCollection(
  collectionName: ProductCollection["name"],
): readonly Product[] {
  return products.filter((product) => product.collection === collectionName);
}

export function getRelatedProducts(
  product: Product,
  limit: number,
): readonly Product[] {
  return products
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        (candidate.category === product.category ||
          candidate.collection === product.collection),
    )
    .slice(0, limit);
}

export function getFeaturedProducts(): readonly Product[] {
  return products.slice(0, 6);
}

export function getCapsuleProducts(): readonly Product[] {
  return products.slice(6, 12);
}

export function getCoreProducts(): readonly Product[] {
  return products;
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
