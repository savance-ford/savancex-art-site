import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { getAllProducts } from "@/lib/commerce/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Shop all",
    description:
      "Explore every current drop, core style, hoodie, crewneck, and heavyweight graphic tee.",
    alternates: { canonical: "/shop" },
  };
}

export default function ShopPage() {
  return <CatalogPage products={getAllProducts()} />;
}
