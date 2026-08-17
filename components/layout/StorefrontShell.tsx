"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { NewsletterSection } from "@/components/layout/NewsletterSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UtilityBar } from "@/components/layout/UtilityBar";

interface StorefrontShellProps {
  readonly children: ReactNode;
}

export function StorefrontShell({ children }: StorefrontShellProps) {
  const pathname = usePathname();
  const { lines, isHydrated } = useCart();
  const usesCheckoutShell =
    pathname === "/checkout" && isHydrated && lines.length > 0;

  if (usesCheckoutShell) return children;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <UtilityBar />
      <SiteHeader />
      {children}
      <NewsletterSection />
      <SiteFooter />
    </>
  );
}
