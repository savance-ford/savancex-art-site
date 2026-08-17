import Link from "next/link";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { Product } from "@/types/commerce";

interface FeaturedCollectionSectionProps {
  readonly products: readonly Product[];
}

export function FeaturedCollectionSection({
  products,
}: FeaturedCollectionSectionProps) {
  return (
    <section className="reference-section reference-section--featured">
      <div className="reference-heading">
        <h1>The greatest collection we&apos;ve made</h1>
        <p>
          Premium heavyweight essentials, expressive graphics, and limited-run
          colorways.
        </p>
      </div>
      <ProductGrid products={products} columns={3} />
      <div className="reference-section__cta">
        <Link href="/shop" className="reference-outline-button">
          Shop all products
        </Link>
      </div>
    </section>
  );
}
