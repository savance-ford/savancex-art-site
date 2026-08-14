import Image from "next/image";

export default function HomePage() {
  return (
    <main id="main" className="container">
      <div className="wordmark">
        <Image src="/assets/logo.svg" alt="NOCTRA" width={700} height={180} priority />
      </div>
      <p className="eyebrow">Next.js foundation</p>
      <Image
        src="/assets/hero-main.jpg"
        alt="Streetwear campaign placeholder"
        width={1800}
        height={1100}
        priority
      />
    </main>
  );
}
