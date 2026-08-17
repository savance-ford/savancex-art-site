import type { Metadata } from "next";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { CustomerCareNavigation } from "@/components/layout/CustomerCareNavigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Wash Guide",
  alternates: { canonical: "/wash-guide" },
};

export default function WashGuidePage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container content-grid">
          <CustomerCareNavigation />
          <article className="prose">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Wash guide" },
              ]}
            />
            <h1>Wash guide</h1>
            <p>
              Good care preserves garment shape, color, and printed artwork.
              The steps below are safe placeholder guidance for most cotton
              streetwear.
            </p>
            <h2>1. Turn garments inside out</h2>
            <p>
              This reduces direct friction against printed artwork and helps
              preserve surface color.
            </p>
            <h2>2. Wash cold</h2>
            <p>
              Use a gentle cycle with similar colors. Avoid bleach and strong
              stain treatments directly on the print.
            </p>
            <h2>3. Air dry when possible</h2>
            <p>
              Hang dry or lay flat. When a dryer is necessary, use the lowest
              heat setting.
            </p>
            <h2>4. Do not iron the graphic</h2>
            <p>
              Iron inside out on low heat and keep direct heat away from printed
              areas.
            </p>
            <div className="callout">
              Always replace this guidance with instructions that match your
              exact garment blanks, inks, embroidery, and wash treatments.
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
