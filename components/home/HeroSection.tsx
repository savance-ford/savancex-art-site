import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="reference-hero">
      <Image
        src="/assets/hero-main.jpg"
        alt="Streetwear campaign placeholder"
        fill
        sizes="100vw"
        priority
        unoptimized
      />
      <div className="reference-hero__shade" />
      <div className="reference-hero__content">
        <Link href="/shop" className="reference-hero__button">
          Shop now
        </Link>
      </div>
    </section>
  );
}
