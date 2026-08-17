import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewTicker } from "@/components/home/ReviewTicker";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInformation } from "@/components/product/ProductInformation";
import { ProductTrustRow } from "@/components/product/ProductTrustRow";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/commerce/catalog";

interface ProductPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      images: [{ url: product.image, alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const relatedProducts = getRelatedProducts(product, 5);

  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="product-page">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              { label: product.name },
            ]}
          />
          <div className="product-layout">
            <ProductGallery product={product} />
            <ProductInformation product={product} />
          </div>
          <ProductTrustRow />
        </div>
      </section>
      <ReviewTicker />
      <RelatedProducts products={relatedProducts} />
    </main>
  );
}
