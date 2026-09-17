"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/CartProvider";

export function ClearPaidCart({
  paymentConfirmed,
}: {
  readonly paymentConfirmed: boolean;
}) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (paymentConfirmed) clearCart();
  }, [clearCart, paymentConfirmed]);

  return null;
}
