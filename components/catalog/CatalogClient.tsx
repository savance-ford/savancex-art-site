"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { FilterDrawer } from "@/components/catalog/FilterDrawer";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import type {
  CatalogFilterState,
  Product,
  SortOption,
} from "@/types/commerce";

const EMPTY_FILTERS: CatalogFilterState = {
  categories: [],
  availableOnly: false,
  under50: false,
};

interface CatalogClientProps {
  readonly products: readonly Product[];
  readonly categoryPills: ReactNode;
  readonly initialGrid: ReactNode;
}

function applyCatalogState(
  products: readonly Product[],
  filters: CatalogFilterState,
  sort: SortOption,
): readonly Product[] {
  let result = [...products];

  if (filters.categories.length) {
    result = result.filter((product) =>
      filters.categories.includes(product.category),
    );
  }
  if (filters.availableOnly) {
    result = result.filter((product) => !product.soldOut);
  }
  if (filters.under50) {
    result = result.filter((product) => product.price < 50);
  }

  if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
  if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

export function CatalogClient({
  products,
  categoryPills,
  initialGrid,
}: CatalogClientProps) {
  const [sort, setSort] = useState<SortOption>("featured");
  const [filters, setFilters] =
    useState<CatalogFilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<CatalogFilterState>(EMPTY_FILTERS);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { openFilterDrawer, closeOverlay } = useStorefrontOverlay();
  const visibleProducts = useMemo(
    () => applyCatalogState(products, filters, sort),
    [products, filters, sort],
  );

  function handleOpenFilters() {
    setDraftFilters({
      categories: [...filters.categories],
      availableOnly: filters.availableOnly,
      under50: filters.under50,
    });
    openFilterDrawer();
  }

  function handleSortChange(value: SortOption) {
    setSort(value);
    setHasInteracted(true);
  }

  function handleApplyFilters() {
    setFilters(draftFilters);
    setHasInteracted(true);
    closeOverlay();
  }

  function handleResetFilters() {
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setHasInteracted(true);
    closeOverlay();
  }

  return (
    <>
      <CatalogToolbar
        categoryPills={categoryPills}
        productCount={visibleProducts.length}
        sort={sort}
        onOpenFilters={handleOpenFilters}
        onSortChange={handleSortChange}
      />
      <section className="shop-results">
        <div className="container">
          {!hasInteracted ? (
            initialGrid
          ) : visibleProducts.length ? (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <h2>No signal found.</h2>
                <p>Try clearing one of the active filters.</p>
                <button
                  type="button"
                  className="btn"
                  data-action="reset-filters"
                  onClick={handleResetFilters}
                >
                  Reset filters
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <FilterDrawer
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </>
  );
}
