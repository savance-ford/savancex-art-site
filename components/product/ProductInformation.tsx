import { FitMeter } from "@/components/product/FitMeter";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductRating } from "@/components/ui/ProductRating";
import { formatMoney } from "@/lib/formatting/money";
import type { Product } from "@/types/commerce";

interface ProductInformationProps {
  readonly product: Product;
}

export function ProductInformation({ product }: ProductInformationProps) {
  return (
    <aside className="product-info" data-product-view={product.id}>
      <span className="eyebrow">
        {product.collection} / {product.category}
      </span>
      <h1 className="product-title">{product.name}</h1>
      <ProductRating rating={product.rating} reviews={product.reviews} />
      <div className="product-price">
        <s>{formatMoney(product.compareAt)}</s>
        <strong>{formatMoney(product.price)} USD</strong>
      </div>
      <p className="product-summary">{product.summary}</p>
      <ProductPurchasePanel product={product} />
      <FitMeter fit={product.fit} />
      <ul className="feature-list">
        {product.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <ProductAccordion />
    </aside>
  );
}
