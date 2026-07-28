import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /home and /whats-on/new are temporary event-card variant previews —
        // remove these two entries when those routes are deleted.
        disallow: ["/admin/", "/home", "/whats-on/new"],
      },
    ],
    sitemap: "https://destinytees.uk/sitemap.xml",
  };
}
