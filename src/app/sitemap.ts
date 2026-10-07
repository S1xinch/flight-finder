import type { MetadataRoute } from "next";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/login", "/register", "/accounts", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}` }));
}
