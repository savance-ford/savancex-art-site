import Image from "next/image";
import Link from "next/link";

export function BrandStorySection() {
  return (
    <section className="reference-story">
      <div className="reference-story__image">
        <Image
          src="/assets/editorial/editorial-a.jpg"
          alt="NOCTRA campaign placeholder"
          width={3648}
          height={4560}
          sizes="(max-width: 820px) 100vw, 50vw"
          loading="eager"
          unoptimized
        />
      </div>
      <div className="reference-story__copy">
        <span>About the brand</span>
        <h2>Why NOCTRA?</h2>
        <p className="reference-story__lead">
          Clothing should feel like confidence before anyone reads the graphic.
        </p>
        <p>
          NOCTRA is an original placeholder identity created for this
          implementation. Its product language focuses on heavyweight
          construction, easy oversized fits, limited drops, and artwork that
          feels collected rather than disposable.
        </p>
        <p>
          The shopping experience keeps discovery direct: strong campaign
          imagery, clean product grids, clear sizing information, visible
          reviews, and a persistent cart that works across every page.
        </p>
        <Link href="/about" className="reference-outline-button">
          Learn about NOCTRA
        </Link>
      </div>
    </section>
  );
}
