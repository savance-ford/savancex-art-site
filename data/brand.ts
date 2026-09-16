import type { Brand } from "@/types/commerce";

export const brand = {
  name: "NOCTRA",
  tagline: "Designed after dark. Built for everywhere.",
  shippingThreshold: 75,
} as const satisfies Brand;
