import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/types/commerce";

interface ProductRailProps {
  readonly products: readonly Product[];
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
