import { ProductCard } from "@/components/catalog/ProductCard";
import type { CatalogProduct } from "@/lib/commerce/types";

interface ProductRailProps {
  readonly products: readonly CatalogProduct[];
}

export function ProductRail({ products }: ProductRailProps) {
  return (
    <div className="product-rail">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
