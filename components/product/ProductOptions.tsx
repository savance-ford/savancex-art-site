"use client";

import Link from "next/link";
import type { Product, ProductOptionSelection, ProductSize } from "@/types/commerce";

interface ProductOptionsProps {
  readonly product: Product;
  readonly selection: ProductOptionSelection;
  readonly onColorChange: (color: string) => void;
  readonly onSizeChange: (size: ProductSize) => void;
}

export function ProductOptions({
  product,
  selection,
  onColorChange,
  onSizeChange,
}: ProductOptionsProps) {
  return (
    <>
      <div className="option-group">
        <div className="option-label">
          <span>
            Color — <b data-selected-color>{selection.color}</b>
          </span>
        </div>
        <div className="swatches">
          {product.colors.map((color) => (
            <button
              type="button"
              className={`swatch${selection.color === color ? " is-selected" : ""}`}
              data-action="select-color"
              data-color={color}
              aria-pressed={selection.color === color}
              onClick={() => onColorChange(color)}
              key={color}
            >
              <span className="swatch-dot" />
              {color}
            </button>
          ))}
        </div>
      </div>
      <div className="option-group">
        <div className="option-label">
          <span>
            Size — <b data-selected-size>{selection.size}</b>
          </span>
          <Link href="/size-guide">Size guide</Link>
        </div>
        <div className="sizes">
          {product.sizes.map((size) => (
            <button
              type="button"
              className={`size-button${selection.size === size ? " is-selected" : ""}`}
              data-action="select-size"
              data-size={size}
              aria-pressed={selection.size === size}
              onClick={() => onSizeChange(size)}
              key={size}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
