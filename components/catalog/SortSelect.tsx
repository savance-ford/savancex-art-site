"use client";

import type { SortOption } from "@/types/commerce";

interface SortSelectProps {
  readonly value: SortOption;
  readonly onChange: (value: SortOption) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      data-action="sort"
      aria-label="Sort products"
      value={value}
      onChange={(event) => onChange(event.target.value as SortOption)}
    >
      <option value="featured">Featured</option>
      <option value="price-asc">Price low-high</option>
      <option value="price-desc">Price high-low</option>
      <option value="name">Alphabetical</option>
    </select>
  );
}
