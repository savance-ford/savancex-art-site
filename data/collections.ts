import type { ProductCollection } from "@/types/commerce";

export const collections = [
  {
    slug: "after-hours",
    name: "After Hours",
    eyebrow: "DROP 04",
    description:
      "Warm oxide, midnight black, and oversized broadcast graphics for the hours nobody sees.",
    image: "/assets/editorial/editorial-a.jpg",
  },
  {
    slug: "static-bloom",
    name: "Static Bloom",
    eyebrow: "DROP 03",
    description:
      "Soft color interrupted by technical type, analog noise, and heavyweight silhouettes.",
    image: "/assets/editorial/editorial-b.jpg",
  },
  {
    slug: "archive-01",
    name: "Archive 01",
    eyebrow: "CORE COLLECTION",
    description:
      "The pieces that defined the first signal: direct graphics, wearable color, and durable blanks.",
    image: "/assets/editorial/editorial-c.jpg",
  },
] as const satisfies readonly ProductCollection[];
