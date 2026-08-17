import Link from "next/link";
import type { ProductCategory } from "@/types/commerce";

interface CategoryPillsProps {
  readonly activeCategory?: ProductCategory;
}

const CATEGORY_LINKS = [
  { href: "/shop", label: "All" },
  { href: "/shop/t-shirts", label: "T-Shirts" },
  { href: "/shop/hoodies", label: "Hoodies" },
  { href: "/shop/crewnecks", label: "Crewnecks" },
] as const;

export function CategoryPills({ activeCategory }: CategoryPillsProps) {
  return (
    <div className="category-pills">
      {CATEGORY_LINKS.map((category) => {
        const isActive = category.label === (activeCategory ?? "All");

        return (
          <Link
            href={category.href}
            className={`pill${isActive ? " is-active" : ""}`}
            key={category.href}
          >
            {category.label}
          </Link>
        );
      })}
    </div>
  );
}
