import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/auth", "/api"] },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
