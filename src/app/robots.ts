import type { MetadataRoute } from "next";

/** Public pages may be indexed; the portal, admin, booking pages and the API may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/da/portal", "/en/portal", "/da/admin", "/en/admin", "/da/booking/", "/en/booking/", "/da/log-ind", "/en/log-ind", "/auth/", "/api/"] }],
    sitemap: "https://www.trustusconsult.dk/sitemap.xml",
  };
}
