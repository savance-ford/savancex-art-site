import { ProductCard } from "@/components/catalog/ProductCard";
import type { CatalogProduct } from "@/lib/commerce/types";

type ProductGridColumnCount = 3 | 4;

interface ProductGridProps {
  readonly products: readonly CatalogProduct[];
  readonly columns?: ProductGridColumnCount;
}

const GRID_CLASS_BY_COLUMN_COUNT = {
  3: "reference-product-grid--three",
  4: "reference-product-grid--four",
} as const satisfies Readonly<Record<ProductGridColumnCount, string>>;

export function ProductGrid({ products, columns }: ProductGridProps) {
  const className = columns
    ? `reference-product-grid ${GRID_CLASS_BY_COLUMN_COUNT[columns]}`
    : "product-grid";

  return (
    <div className={className}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
