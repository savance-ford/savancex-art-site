import type { ProductReview } from "@/types/commerce";

export const reviews = [
  {
    name: "Maya R.",
    title: "Exactly the weight I wanted",
    body: "The tee feels substantial without being stiff. The print is crisp and the boxy fit sits perfectly.",
    rating: 5,
    product: "Signal Loss Tee",
  },
  {
    name: "Jordan K.",
    title: "Hoodie feels premium",
    body: "Heavy, soft inside, and actually oversized in a good way. The details feel considered.",
    rating: 5,
    product: "After Hours Hoodie",
  },
  {
    name: "Drew S.",
    title: "Better in person",
    body: "The colors are richer than they looked on my screen and the collar has not stretched out.",
    rating: 5,
    product: "Static Bloom Tee",
  },
  {
    name: "Nia T.",
    title: "My new favorite crew",
    body: "The shape is clean and the fleece is warm without being bulky. I keep reaching for it.",
    rating: 5,
    product: "Ghost Signal Crew",
  },
  {
    name: "Alex P.",
    title: "Fast, simple shopping flow",
    body: "Sizing was easy to understand, and the product page gave me all the details I needed.",
    rating: 5,
    product: "Orbit Break Tee",
  },
  {
    name: "Sam C.",
    title: "The wash looks great",
    body: "The vintage finish is even and the graphic still feels soft after several washes.",
    rating: 5,
    product: "Double Vision Tee",
  },
] as const satisfies readonly ProductReview[];
