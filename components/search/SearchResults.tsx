import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ArrowIcon } from "@/components/ui/Icons";
import type { CatalogProduct } from "@/lib/commerce/types";

interface SearchResultsProps {
  readonly query: string;
  readonly products: readonly CatalogProduct[];
}

export function SearchResults({ query, products }: SearchResultsProps) {
  const normalizedQuery = query.trim();

  return (
    <>
      <form className="search-page__bar" action="/search" method="get">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search products"
          aria-label="Search products"
          autoFocus
        />
        <button type="submit" aria-label="Submit search">
          <ArrowIcon />
        </button>
      </form>
      {normalizedQuery ? (
        <p className="muted" style={{ marginBottom: 28 }}>
          {products.length} result{products.length === 1 ? "" : "s"} for “
          {query}”
        </p>
      ) : null}
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <div className="empty-state">
          <div>
            <h2>No result.</h2>
            <p>Try a product type, collection name, or broader phrase.</p>
          </div>
        </div>
      )}
    </>
  );
}
