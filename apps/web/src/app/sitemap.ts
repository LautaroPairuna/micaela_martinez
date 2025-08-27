import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Básico: home + listados; si querés, podés fetchear productos/cursos para incluir slugs
  return [
    { url: `${APP_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_URL}/tienda`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/cursos`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];
}
