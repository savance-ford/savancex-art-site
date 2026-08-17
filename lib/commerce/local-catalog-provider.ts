import { products } from "@/data/products";
import type { CatalogProvider } from "@/lib/commerce/catalog-provider";
import type {
  CommercePrice,
  CommerceProduct,
  CommerceVariant,
} from "@/lib/commerce/types";
import type { Product } from "@/types/commerce";

const CURRENCY = "USD";
const EMPTY_VARIANTS: readonly CommerceVariant[] = Object.freeze([]);

function toPrice(value: number): CommercePrice {
  return Object.freeze({
    amount: Math.round(value * 100),
    currency: CURRENCY,
  });
}

function toVariantSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function toCommerceProduct(product: Product): CommerceProduct {
  return Object.freeze({
    id: product.id,
    externalId: null,
    slug: product.slug,
    name: product.name,
    description: product.summary,
    category: product.category,
    collection: product.collection,
    defaultPrice: toPrice(product.price),
    compareAtPrice: toPrice(product.compareAt),
    image: product.image,
    alternateImage: product.altImage,
    badge: product.badge || null,
    rating: product.rating,
    reviewCount: product.reviews,
    features: product.features,
    fit: product.fit,
    available: !product.soldOut,
  });
}

function toCommerceVariants(product: Product): readonly CommerceVariant[] {
  return Object.freeze(
    product.colors.flatMap((color) =>
      product.sizes.map((size) =>
        Object.freeze({
          id: `local:${product.id}:${toVariantSegment(color)}:${toVariantSegment(size)}`,
          externalId: null,
          productId: product.id,
          name: `${color} / ${size}`,
          sku: null,
          options: Object.freeze({ color, size }),
          price: toPrice(product.price),
          image: product.image,
          available: !product.soldOut,
        }),
      ),
    ),
  );
}

const localProducts: readonly CommerceProduct[] = Object.freeze(
  products.map(toCommerceProduct),
);
const localVariants: readonly CommerceVariant[] = Object.freeze(
  products.flatMap(toCommerceVariants),
);
const productsBySlug = new Map(
  localProducts.map((product) => [product.slug, product] as const),
);
const variantsByProductId = new Map<string, readonly CommerceVariant[]>(
  localProducts.map((product) => [
    product.id,
    Object.freeze(
      localVariants.filter((variant) => variant.productId === product.id),
    ),
  ]),
);
const inventoryByVariantId = new Map(
  localVariants.map((variant) => [
    variant.id,
    variant.available ? null : 0,
  ] as const),
);

class LocalCatalogProvider implements CatalogProvider {
  async listProducts(): Promise<readonly CommerceProduct[]> {
    return localProducts;
  }

  async getProduct(slug: string): Promise<CommerceProduct | null> {
    return productsBySlug.get(slug) ?? null;
  }

  async getProductVariants(
    productId: string,
  ): Promise<readonly CommerceVariant[]> {
    return variantsByProductId.get(productId) ?? EMPTY_VARIANTS;
  }

  async getInventory(variantId: string): Promise<number | null> {
    if (!inventoryByVariantId.has(variantId)) return 0;
    return inventoryByVariantId.get(variantId) ?? null;
  }
}

export const localCatalogProvider: CatalogProvider =
  new LocalCatalogProvider();
