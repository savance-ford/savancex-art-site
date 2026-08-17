import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAVANCEX",
    short_name: "SAVANCEX",
    description:
      "Independent streetwear, heavyweight essentials, and limited collections.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/assets/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
