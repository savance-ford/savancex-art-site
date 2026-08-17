import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NewsletterSection } from "@/components/layout/NewsletterSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UtilityBar } from "@/components/layout/UtilityBar";
import "./globals.css";

export const metadata: Metadata = {
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
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <UtilityBar />
        <SiteHeader />
        {children}
        <NewsletterSection />
        <SiteFooter />
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
