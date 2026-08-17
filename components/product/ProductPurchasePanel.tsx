"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { ProductOptions } from "@/components/product/ProductOptions";
import type { Product, ProductOptionSelection } from "@/types/commerce";

interface ProductPurchasePanelProps {
  readonly product: Product;
}

function getInitialSelection(product: Product): ProductOptionSelection {
  const color = product.colors[0];
  const size = product.sizes.includes("M") ? "M" : product.sizes[0];

  if (!color || !size) {
    throw new Error(`Product ${product.id} must define at least one variant`);
  }

  return { color, size };
}

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const [selection, setSelection] = useState<ProductOptionSelection>(() =>
    getInitialSelection(product),
  );
  const { addItem } = useCart();

  return (
    <>
      <ProductOptions
        product={product}
        selection={selection}
        onColorChange={(color) =>
          setSelection((current) => ({ ...current, color }))
        }
        onSizeChange={(size) =>
          setSelection((current) => ({ ...current, size }))
        }
      />
      <button
        type="button"
        className="btn btn--wide btn--accent"
        data-action="add-product"
        data-product={product.id}
        disabled={product.soldOut}
        onClick={() =>
          addItem({
            productId: product.id,
            color: selection.color,
            size: selection.size,
          })
        }
      >
        {product.soldOut ? "Sold out" : "Add to bag"}
      </button>
    </>
  );
}
