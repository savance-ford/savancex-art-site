import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { StorefrontShell } from "@/components/layout/StorefrontShell";
import { OverlayProvider } from "@/components/overlays/OverlayProvider";
import { ToastProvider } from "@/components/overlays/ToastProvider";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { getAllProducts } from "@/lib/commerce/catalog";
import type { CatalogProduct } from "@/lib/commerce/types";
import "./globals.css";

const SITE_URL = "https://savancex.art";
const SITE_TITLE = "SAVANCEX — Independent Streetwear";
const SITE_DESCRIPTION =
  "Shop SAVANCEX independent streetwear, including heavyweight graphic tees, hoodies, crewnecks, and limited collections.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — SAVANCEX",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SAVANCEX",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/assets/hero-main.jpg",
        width: 4234,
        height: 6508,
        alt: "SAVANCEX storefront campaign",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/assets/hero-main.jpg"],
  },
  icons: {
    icon: [{ url: "/assets/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/assets/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

async function getShellCatalog(): Promise<{
  catalog: readonly CatalogProduct[];
  catalogAvailable: boolean;
}> {
  try {
    return { catalog: await getAllProducts(), catalogAvailable: true };
  } catch {
    return { catalog: [], catalogAvailable: false };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { catalog, catalogAvailable } = await getShellCatalog();

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <OverlayProvider>
            <CartProvider
              catalog={catalog}
              catalogAvailable={catalogAvailable}
            >
              <StorefrontShell>{children}</StorefrontShell>
              <CartDrawer />
              <SearchOverlay
                products={catalog}
                catalogAvailable={catalogAvailable}
              />
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
