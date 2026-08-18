import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { CatalogProduct } from "@/lib/commerce/types";

interface CapsuleRestockSectionProps {
  readonly products: readonly CatalogProduct[];
}

export function CapsuleRestockSection({
  products,
}: CapsuleRestockSectionProps) {
  return (
    <section className="reference-section reference-section--capsule">
      <div className="reference-heading reference-heading--urgent">
        <h2>🚨 Final capsule restock 🚨</h2>
        <p>
          One last release from the archive. Once these sizes are gone, this
          capsule closes.
        </p>
      </div>
      <ProductGrid products={products} columns={3} />
    </section>
  );
}
