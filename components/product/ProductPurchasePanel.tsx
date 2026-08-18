"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { ProductOptions } from "@/components/product/ProductOptions";
import { formatCommercePrice } from "@/lib/commerce/pricing";
import type {
  CatalogProduct,
  CommerceVariant,
} from "@/lib/commerce/types";
import type { ProductOptionSelection } from "@/types/commerce";

interface ProductPurchasePanelProps {
  readonly product: CatalogProduct;
}

function getPreferredVariant(
  variants: readonly CommerceVariant[],
): CommerceVariant | undefined {
  const availableVariants = variants.filter((variant) => variant.available);
  return (
    availableVariants.find((variant) => variant.options.size === "M") ??
    availableVariants[0]
  );
}

function getInitialSelection(product: CatalogProduct): ProductOptionSelection {
  const variant = getPreferredVariant(product.variants);

  return {
    color: variant?.options.color ?? "",
    size: variant?.options.size ?? "",
  };
}

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const [selection, setSelection] = useState<ProductOptionSelection>(() =>
    getInitialSelection(product),
  );
  const { addItem } = useCart();
  const selectedVariant = product.variants.find(
    (variant) =>
      variant.available &&
      variant.options.color === selection.color &&
      variant.options.size === selection.size,
  );
  const displayedPrice = selectedVariant?.price ?? product.defaultPrice;

  function handleColorChange(color: string) {
    const colorVariants = product.variants.filter(
      (variant) => variant.available && variant.options.color === color,
    );
    const nextVariant =
      colorVariants.find((variant) => variant.options.size === selection.size) ??
      getPreferredVariant(colorVariants);

    if (nextVariant) {
      setSelection({ color, size: nextVariant.options.size });
    }
  }

  return (
    <>
      <div className="product-price">
        {product.compareAtPrice ? (
          <s>{formatCommercePrice(product.compareAtPrice)}</s>
        ) : null}
        <strong>{formatCommercePrice(displayedPrice)} USD</strong>
      </div>
      <p className="product-summary">{product.description}</p>
      <ProductOptions
        variants={product.variants}
        selection={selection}
        onColorChange={handleColorChange}
        onSizeChange={(size) =>
          setSelection((current) => ({ ...current, size }))
        }
      />
      <button
        type="button"
        className="btn btn--wide btn--accent"
        data-action="add-product"
        data-product={product.id}
        disabled={!selectedVariant}
        onClick={() =>
          selectedVariant
            ? addItem({ productId: product.id, variantId: selectedVariant.id })
            : undefined
        }
      >
        {!selectedVariant ? "Sold out" : "Add to bag"}
      </button>
    </>
  );
}
