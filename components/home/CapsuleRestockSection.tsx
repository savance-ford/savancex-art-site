import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { Product } from "@/types/commerce";

interface CapsuleRestockSectionProps {
  readonly products: readonly Product[];
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
