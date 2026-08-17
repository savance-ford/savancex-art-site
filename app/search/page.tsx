import type { Metadata } from "next";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { SearchResults } from "@/components/search/SearchResults";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getAllProducts } from "@/lib/commerce/catalog";

export const metadata: Metadata = {
  title: "Search",
  alternates: { canonical: "/search" },
};

interface SearchPageProps {
  readonly searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : q;
  const normalizedQuery = query.trim().toLowerCase();
  const products = normalizedQuery
    ? getAllProducts().filter((product) =>
        `${product.name} ${product.category} ${product.collection} ${product.summary}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : getAllProducts();

  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Search" }]}
          />
          <h1 className="display" style={{ marginBottom: 35 }}>
            Search.
          </h1>
          <SearchResults query={query} products={products} />
        </div>
      </section>
    </main>
  );
}
