"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { formatMoney } from "@/lib/formatting/money";
import type { Product } from "@/types/commerce";

interface ProductCardProps {
  readonly product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const badge = product.soldOut ? "Sold out" : product.badge;
  const badgeClasses = [
    "product-card__badge",
    product.soldOut ? "product-card__badge--sold" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="product-card" data-product-card={product.id}>
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
            src={product.altImage}
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
          disabled={product.soldOut}
          onClick={() => addItem({ productId: product.id })}
        >
          {product.soldOut ? "Sold out" : "Quick add"}
        </button>
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card__reviews">
          <span aria-hidden="true">★★★★★</span>{" "}
          <small>{product.reviews} reviews</small>
        </div>
        <div className="product-card__meta">
          <div className="product-card__price">
            <span className="product-card__compare">
              {formatMoney(product.compareAt)}
            </span>
            <strong>{formatMoney(product.price)}</strong>
          </div>
          <div
            className="product-card__dots"
            aria-label={`${product.colors.length} colors`}
          >
            <span />
            {product.colors.length > 1 ? <span /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
