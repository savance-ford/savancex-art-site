import Image from "next/image";

const COMMUNITY_IMAGES = [
  "/assets/editorial/editorial-a.jpg",
  "/assets/editorial/editorial-b.jpg",
  "/assets/editorial/editorial-c.jpg",
  "/assets/editorial/community-wide.jpg",
  "/assets/hero-main.jpg",
  "/assets/editorial/editorial-b.jpg",
] as const;

const COMMUNITY_IMAGE_SIZES = [
  { width: 3648, height: 4560 },
  { width: 4480, height: 5683 },
  { width: 3648, height: 4560 },
  { width: 5014, height: 3343 },
  { width: 4234, height: 6508 },
  { width: 4480, height: 5683 },
] as const;

export function CommunitySection() {
  return (
    <section className="reference-community">
      <div className="container">
        <div className="reference-heading">
          <h2>Join the 60k-strong NOCTRA family</h2>
          <p>
            Follow the community and tag your fit for a chance to be featured.
          </p>
        </div>
        <div className="reference-community__grid">
          {COMMUNITY_IMAGES.map((src, index) => (
            <a
              href="#"
              className="reference-community__card"
              key={`${src}-${index}`}
            >
              <Image
                src={src}
                alt={`Community style placeholder ${index + 1}`}
                width={COMMUNITY_IMAGE_SIZES[index].width}
                height={COMMUNITY_IMAGE_SIZES[index].height}
                sizes="(max-width: 820px) 50vw, 33vw"
                unoptimized
              />
              <span>@noctra.community</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
