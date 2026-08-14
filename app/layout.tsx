import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
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
        {children}
      </body>
    </html>
  );
}
