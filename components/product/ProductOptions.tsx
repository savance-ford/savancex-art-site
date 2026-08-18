"use client";

import Link from "next/link";
import type { CommerceVariant } from "@/lib/commerce/types";
import type { ProductOptionSelection } from "@/types/commerce";

interface ProductOptionsProps {
  readonly variants: readonly CommerceVariant[];
  readonly selection: ProductOptionSelection;
  readonly onColorChange: (color: string) => void;
  readonly onSizeChange: (size: string) => void;
}

export function ProductOptions({
  variants,
  selection,
  onColorChange,
  onSizeChange,
}: ProductOptionsProps) {
  const colors = [...new Set(variants.map((variant) => variant.options.color))];
  const sizes = [...new Set(variants.map((variant) => variant.options.size))];

  return (
    <>
      <div className="option-group">
        <div className="option-label">
          <span>
            Color — <b data-selected-color>{selection.color}</b>
          </span>
        </div>
        <div className="swatches">
          {colors.map((color) => {
            const available = variants.some(
              (variant) => variant.available && variant.options.color === color,
            );

            return (
              <button
                type="button"
                className={`swatch${selection.color === color ? " is-selected" : ""}`}
                data-action="select-color"
                data-color={color}
                aria-pressed={selection.color === color}
                disabled={!available}
                onClick={() => onColorChange(color)}
                key={color}
              >
                <span className="swatch-dot" />
                {color}
              </button>
            );
          })}
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
          {sizes.map((size) => {
            const available = variants.some(
              (variant) =>
                variant.available &&
                variant.options.color === selection.color &&
                variant.options.size === size,
            );

            return (
              <button
                type="button"
                className={`size-button${selection.size === size ? " is-selected" : ""}`}
                data-action="select-size"
                data-size={size}
                aria-pressed={selection.size === size}
                disabled={!available}
                onClick={() => onSizeChange(size)}
                key={size}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
