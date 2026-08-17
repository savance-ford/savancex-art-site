"use client";

import type { ReactNode } from "react";
import { SortSelect } from "@/components/catalog/SortSelect";
import type { SortOption } from "@/types/commerce";

interface CatalogToolbarProps {
  readonly categoryPills: ReactNode;
  readonly productCount: number;
  readonly sort: SortOption;
  readonly onOpenFilters: () => void;
  readonly onSortChange: (sort: SortOption) => void;
}

export function CatalogToolbar({
  categoryPills,
  productCount,
  sort,
  onOpenFilters,
  onSortChange,
}: CatalogToolbarProps) {
  return (
    <div className="shop-toolbar">
      <div className="container shop-toolbar__inner">
        {categoryPills}
        <div className="toolbar-actions">
          <span className="product-count">{productCount} products</span>
          <button
            type="button"
            data-action="open-filter"
            onClick={onOpenFilters}
          >
            Filter
          </button>
          <SortSelect value={sort} onChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}
