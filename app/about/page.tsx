import type { Metadata } from "next";
import Image from "next/image";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="story-grid">
        <div className="story-grid__media">
          <Image
            src="/assets/editorial/editorial-3.svg"
            alt="NOCTRA studio story placeholder"
            width={1000}
            height={1000}
          />
        </div>
        <div className="story-grid__copy">
          <span className="kicker">Our story</span>
          <h1 className="section-title">Built from a late-night idea.</h1>
          <p className="quote">
            A fictional brand. A complete storefront foundation.
          </p>
          <p>
            NOCTRA is original placeholder branding used to demonstrate the
            visual system, shopping flow, page hierarchy, and interaction model
            of a polished streetwear store without copying another brand’s
            identity, product artwork, or written content.
          </p>
          <p>
            The concept centers on heavyweight garments, expressive graphic
            layouts, and an editorial rhythm that repeatedly connects campaign
            imagery to shoppable products.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="page-hero__row">
            <h2 className="display">Expression first.</h2>
            <div>
              <p>
                Large campaign moments create mood. Product grids provide
                clarity. Reviews reduce uncertainty. Deep product pages answer
                fit, shipping, care, and quality questions before checkout.
              </p>
              <p>
                The entire prototype is data-driven, so product names, imagery,
                prices, categories, collections, and content can be replaced
                without rewriting the page structure.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
