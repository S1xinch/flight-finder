import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flight Finder",
    short_name: "Flights",
    description: "Compare flight prices, spot deals and get price-drop alerts.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND,
    theme_color: BRAND,
    categories: ["travel"],
    icons: [
      { src: "/pwa/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon/512m", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
