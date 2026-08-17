import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/CartPageClient";

export const metadata: Metadata = {
  title: "Cart",
  alternates: { canonical: "/cart" },
};

export default function CartPage() {
  return <CartPageClient />;
}
