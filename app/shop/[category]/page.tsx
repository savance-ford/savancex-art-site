import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import {
  categorySlugToName,
  getProductsByCategory,
  isValidCategorySlug,
} from "@/lib/commerce/catalog";

interface CategoryPageProps {
  readonly params: Promise<{ category: string }>;
}

const CATEGORY_SLUGS = ["t-shirts", "hoodies", "crewnecks"] as const;
export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  if (!isValidCategorySlug(categorySlug)) notFound();

  const category = categorySlugToName(categorySlug);
  const description = `Explore all ${category.toLowerCase()} in the current placeholder catalog.`;

  return {
    title: category,
    description,
    alternates: { canonical: `/shop/${categorySlug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  if (!isValidCategorySlug(categorySlug)) notFound();

  const category = categorySlugToName(categorySlug);

  return (
    <CatalogPage
      products={await getProductsByCategory(category)}
      category={category}
    />
  );
}
