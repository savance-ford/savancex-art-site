import type { MetadataRoute } from "next";
import { collections } from "@/data/collections";
import { getAllProducts } from "@/lib/commerce/catalog";

const SITE_URL = "https://savancex.art";

const STATIC_ROUTES = [
  "/",
  "/shop",
  "/shop/t-shirts",
  "/shop/hoodies",
  "/shop/crewnecks",
  "/search",
  "/cart",
  "/checkout",
  "/reviews",
  "/about",
  "/contact",
  "/track-order",
  "/size-guide",
  "/wash-guide",
  "/shipping",
  "/account",
] as const;

function sitemapEntry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: new URL(path, SITE_URL).toString(),
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  const staticEntries = STATIC_ROUTES.map((path) =>
    sitemapEntry(
      path,
      path === "/" || path.startsWith("/shop") ? "weekly" : "monthly",
      path === "/" ? 1 : path.startsWith("/shop") ? 0.9 : 0.6,
    ),
  );
  const collectionEntries = collections.map((collection) =>
    sitemapEntry(`/collections/${collection.slug}`, "weekly", 0.8),
  );
  const productEntries = products.map((product) =>
    sitemapEntry(`/products/${product.slug}`, "weekly", 0.8),
  );

  return [...staticEntries, ...collectionEntries, ...productEntries];
}
