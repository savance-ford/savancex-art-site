import { CatalogClient } from "@/components/catalog/CatalogClient";
import { CategoryPills } from "@/components/catalog/CategoryPills";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { CatalogProduct } from "@/lib/commerce/types";
import type { ProductCategory } from "@/types/commerce";

interface CatalogPageProps {
  readonly products: readonly CatalogProduct[];
  readonly category?: ProductCategory;
}

export function CatalogPage({ products, category }: CatalogPageProps) {
  const title = category ?? "Shop all";
  const description = category
    ? `Explore all ${category.toLowerCase()} in the current catalog.`
    : "Explore every current drop, core style, hoodie, crewneck, and heavyweight graphic tee.";

  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
          <div className="page-hero__row">
            <h1 className="display">{title}</h1>
            <p>{description}</p>
          </div>
        </div>
      </section>
      <CatalogClient
        products={products}
        categoryPills={<CategoryPills activeCategory={category} />}
        initialGrid={<ProductGrid products={products} />}
      />
    </main>
  );
}
