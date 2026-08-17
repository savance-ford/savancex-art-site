import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { Product } from "@/types/commerce";

interface CoreCollectionSectionProps {
  readonly products: readonly Product[];
}

export function CoreCollectionSection({ products }: CoreCollectionSectionProps) {
  return (
    <section className="reference-section reference-section--classics">
      <div className="reference-heading reference-heading--left">
        <span>The core collection</span>
        <h2>The GOAT</h2>
        <p>Shop the classics that shaped the first NOCTRA releases.</p>
      </div>
      <ProductGrid products={products} columns={4} />
    </section>
  );
}
