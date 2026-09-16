import { FitMeter } from "@/components/product/FitMeter";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductRating } from "@/components/ui/ProductRating";
import type { CatalogProduct } from "@/lib/commerce/types";

interface ProductInformationProps {
  readonly product: CatalogProduct;
}

export function ProductInformation({ product }: ProductInformationProps) {
  return (
    <aside className="product-info" data-product-view={product.id}>
      <span className="eyebrow">
        {product.collection} / {product.category}
      </span>
      <h1 className="product-title">{product.name}</h1>
      <ProductRating rating={product.rating} reviews={product.reviewCount} />
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
