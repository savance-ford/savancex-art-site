import { ProductRail } from "@/components/catalog/ProductRail";
import type { CatalogProduct } from "@/lib/commerce/types";

interface RelatedProductsProps {
  readonly products: readonly CatalogProduct[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="kicker">Keep browsing</span>
            <h2 className="section-title">You may also like.</h2>
          </div>
        </div>
        <ProductRail products={products} />
      </div>
    </section>
  );
}
