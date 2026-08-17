import { ProductRail } from "@/components/catalog/ProductRail";
import type { Product } from "@/types/commerce";

interface RelatedProductsProps {
  readonly products: readonly Product[];
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
