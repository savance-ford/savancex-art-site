import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { ArrowIcon } from "@/components/ui/Icons";
import { collections } from "@/data/collections";
import {
  getCollectionBySlug,
  getProductsByCollection,
} from "@/lib/commerce/catalog";

interface CollectionPageProps {
  readonly params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) notFound();

  return {
    title: collection.name,
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: collection.name,
      description: collection.description,
      images: [{ url: collection.image, alt: `${collection.name} collection` }],
    },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) notFound();

  const products = await getProductsByCollection(collection.name);

  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="collection-banner">
        <Image
          src={collection.image}
          alt={`${collection.name} collection placeholder`}
          fill
          sizes="100vw"
          priority
          unoptimized
        />
        <div className="container collection-banner__copy">
          <span className="kicker">{collection.eyebrow}</span>
          <h1 className="display">{collection.name}</h1>
          <p>{collection.description}</p>
          <Link href="#collection-products" className="btn btn--light">
            Shop collection <ArrowIcon />
          </Link>
        </div>
      </section>
      <section className="section" id="collection-products">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="kicker">{collection.eyebrow}</span>
              <h2 className="section-title">The full drop.</h2>
            </div>
            <span className="muted">{products.length} pieces</span>
          </div>
          <ProductGrid products={products} />
        </div>
      </section>
    </main>
  );
}
