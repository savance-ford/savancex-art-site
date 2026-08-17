"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { OverlayBackdrop } from "@/components/overlays/OverlayBackdrop";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { usePortalRoot } from "@/components/overlays/usePortalRoot";
import { CloseIcon } from "@/components/ui/Icons";
import type { CatalogFilterState, ProductCategory } from "@/types/commerce";

const PRODUCT_CATEGORIES = [
  "T-Shirts",
  "Hoodies",
  "Crewnecks",
] as const satisfies readonly ProductCategory[];

interface FilterDrawerProps {
  readonly filters: CatalogFilterState;
  readonly onChange: (filters: CatalogFilterState) => void;
  readonly onApply: () => void;
  readonly onReset: () => void;
}

export function FilterDrawer({
  filters,
  onChange,
  onApply,
  onReset,
}: FilterDrawerProps) {
  const { activeOverlay, closeOverlay } = useStorefrontOverlay();
  const overlayRoot = usePortalRoot("overlay-root");
  const isOpen = activeOverlay === "filter";
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const animationFrame = requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  function updateCategory(category: ProductCategory, checked: boolean) {
    onChange({
      ...filters,
      categories: checked
        ? [...filters.categories, category]
        : filters.categories.filter((candidate) => candidate !== category),
    });
  }

  if (!overlayRoot) return null;

  return createPortal(
    <>
      <OverlayBackdrop isOpen={isOpen} onClose={closeOverlay} />
      <aside
        className={`drawer filter-drawer${isOpen ? " is-open" : ""}`}
        aria-label="Filter products"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="drawer__head">
          <h2>Filter products</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            data-action="close-filter"
            aria-label="Close filters"
            onClick={closeOverlay}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body">
          <div className="filter-section">
            <h3>Product type</h3>
            <div className="check-list">
              {PRODUCT_CATEGORIES.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    data-filter-category
                    value={category}
                    checked={filters.categories.includes(category)}
                    onChange={(event) =>
                      updateCategory(category, event.target.checked)
                    }
                  />{" "}
                  {category}
                </label>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <h3>Availability</h3>
            <div className="check-list">
              <label>
                <input
                  type="checkbox"
                  data-filter-available
                  checked={filters.availableOnly}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      availableOnly: event.target.checked,
                    })
                  }
                />{" "}
                In stock only
              </label>
            </div>
          </div>
          <div className="filter-section">
            <h3>Price</h3>
            <div className="check-list">
              <label>
                <input
                  type="checkbox"
                  data-filter-under50
                  checked={filters.under50}
                  onChange={(event) =>
                    onChange({ ...filters, under50: event.target.checked })
                  }
                />{" "}
                Under $50
              </label>
            </div>
          </div>
        </div>
        <div className="drawer__foot">
          <button
            type="button"
            className="btn btn--wide"
            data-action="apply-filters"
            onClick={onApply}
          >
            Apply filters
          </button>
          <button
            type="button"
            className="btn btn--wide btn--outline"
            style={{ marginTop: 10 }}
            data-action="reset-filters"
            onClick={onReset}
          >
            Clear all
          </button>
        </div>
      </aside>
    </>,
    overlayRoot,
  );
}
