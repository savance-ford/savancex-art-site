"use client";

import Image from "next/image";
import Link from "next/link";
import { getCartLineKey, useCart } from "@/components/cart/CartProvider";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { formatCommercePrice } from "@/lib/commerce/pricing";
import type { CartLine as CartLineData } from "@/types/commerce";

interface CartLineProps {
  readonly line: CartLineData;
}

export function CartLine({ line }: CartLineProps) {
  const { catalog, incrementLine, decrementLine, removeLine } = useCart();
  const { closeOverlay } = useStorefrontOverlay();
  const product = catalog.find((item) => item.id === line.productId);

  if (!product) return null;

  const key = getCartLineKey(line);
  const encodedKey = encodeURIComponent(key);

  return (
    <article className="cart-line">
      <Link
        href={`/products/${product.slug}`}
        className="cart-line__image"
        onClick={closeOverlay}
      >
        <Image
          src={product.image}
          alt={product.name}
          width={600}
          height={750}
          unoptimized
        />
      </Link>
      <div>
        <h3>
          <Link href={`/products/${product.slug}`} onClick={closeOverlay}>
            {product.name}
          </Link>
        </h3>
        <div className="cart-line__meta">
          {line.color} / {line.size}
        </div>
        <div className="qty-control">
          <button
            type="button"
            data-action="qty-dec"
            data-key={encodedKey}
            aria-label="Decrease quantity"
            onClick={() => decrementLine(key)}
          >
            −
          </button>
          <span>{line.quantity}</span>
          <button
            type="button"
            data-action="qty-inc"
            data-key={encodedKey}
            aria-label="Increase quantity"
            onClick={() => incrementLine(key)}
          >
            +
          </button>
        </div>
      </div>
      <div className="cart-line__price">
        <strong>
          {formatCommercePrice({
            ...line.displayPrice,
            amount: line.displayPrice.amount * line.quantity,
          })}
        </strong>
        <button
          type="button"
          className="remove-link"
          data-action="remove-line"
          data-key={encodedKey}
          onClick={() => removeLine(key)}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
