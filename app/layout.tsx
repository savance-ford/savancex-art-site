import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { StorefrontShell } from "@/components/layout/StorefrontShell";
import { OverlayProvider } from "@/components/overlays/OverlayProvider";
import { ToastProvider } from "@/components/overlays/ToastProvider";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "NOCTRA — Streetwear Storefront Prototype",
    template: "%s — NOCTRA",
  },
  description:
    "NOCTRA — an original streetwear storefront prototype with editorial product discovery, collection pages, cart flow, search, support pages, and responsive interactions.",
  icons: { icon: "/assets/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <OverlayProvider>
            <CartProvider>
              <StorefrontShell>{children}</StorefrontShell>
              <CartDrawer />
              <SearchOverlay />
              <MobileNavigation />
            </CartProvider>
          </OverlayProvider>
        </ToastProvider>
        <div id="overlay-root" />
        <div id="toast-root" aria-live="polite" />
        <noscript>
          This prototype requires JavaScript for navigation and cart
          interactions.
        </noscript>
      </body>
    </html>
  );
}
