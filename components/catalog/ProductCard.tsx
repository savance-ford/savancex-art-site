"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import {
  formatCommercePrice,
  hasVariableVariantPrices,
} from "@/lib/commerce/pricing";
import type { CatalogProduct } from "@/lib/commerce/types";

interface ProductCardProps {
  readonly product: CatalogProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const badge = !product.available ? "Sold out" : product.badge;
  const colorCount = new Set(
    product.variants.map((variant) => variant.options.color),
  ).size;
  const badgeClasses = [
    "product-card__badge",
    !product.available ? "product-card__badge--sold" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className="product-card"
      data-product-card={product.id}
      data-category={product.category}
      data-price={product.defaultPrice.amount}
      data-available={product.available}
    >
      <div className="product-card__media">
        <Link
          href={`/products/${product.slug}`}
          className="product-card__image-link"
          aria-label={`View ${product.name}`}
        >
          <span className={badgeClasses}>{badge}</span>
          <Image
            src={product.image}
            alt={`${product.name} front placeholder`}
            width={800}
            height={900}
            sizes="(max-width: 820px) 50vw, 33vw"
            unoptimized
          />
          <Image
            src={product.alternateImage}
            alt={`${product.name} back placeholder`}
            width={800}
            height={900}
            sizes="(max-width: 820px) 50vw, 33vw"
            unoptimized
          />
        </Link>
        <button
          type="button"
          className="quick-add"
          data-action="quick-add"
          data-product={product.id}
          disabled={!product.available}
          onClick={() => addItem({ productId: product.id })}
        >
          {!product.available ? "Sold out" : "Quick add"}
        </button>
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card__reviews">
          <span aria-hidden="true">★★★★★</span>{" "}
          <small>{product.reviewCount} reviews</small>
        </div>
        <div className="product-card__meta">
          <div className="product-card__price">
            <span className="product-card__compare">
              {product.compareAtPrice
                ? formatCommercePrice(product.compareAtPrice)
                : null}
            </span>
            <strong>
              {hasVariableVariantPrices(product.variants) ? "From " : ""}
              {formatCommercePrice(product.defaultPrice)}
            </strong>
          </div>
          <div
            className="product-card__dots"
            aria-label={`${colorCount} colors`}
          >
            <span />
            {colorCount > 1 ? <span /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
