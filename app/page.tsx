import { getAllProducts } from "@/lib/commerce/catalog";

export default function HomePage() {
  const productCount = getAllProducts().length;

  return (
    <main id="main" className="container" data-development-only>
      <p>{productCount} products loaded.</p>
    </main>
  );
}
