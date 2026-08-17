import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { BrandStorySection } from "@/components/home/BrandStorySection";
import { CapsuleRestockSection } from "@/components/home/CapsuleRestockSection";
import { CommunitySection } from "@/components/home/CommunitySection";
import { CoreCollectionSection } from "@/components/home/CoreCollectionSection";
import { FeaturedCollectionSection } from "@/components/home/FeaturedCollectionSection";
import { HeroSection } from "@/components/home/HeroSection";
import { ReviewProofSection } from "@/components/home/ReviewProofSection";
import { ReviewTicker } from "@/components/home/ReviewTicker";
import {
  getCapsuleProducts,
  getCoreProducts,
  getFeaturedProducts,
} from "@/lib/commerce/catalog";

export default function HomePage() {
  const featuredProducts = getFeaturedProducts();
  const capsuleProducts = getCapsuleProducts();
  const coreProducts = getCoreProducts();

  return (
    <main id="main">
      <HeroSection />
      <AnnouncementMarquee />
      <FeaturedCollectionSection products={featuredProducts} />
      <ReviewTicker />
      <CapsuleRestockSection products={capsuleProducts} />
      <ReviewProofSection />
      <CoreCollectionSection products={coreProducts} />
      <BrandStorySection />
      <CommunitySection />
    </main>
  );
}
