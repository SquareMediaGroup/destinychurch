import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Signed-in areas. /api/ stays crawlable: pages load thumbnails and
        // data from it, and Google needs those to render them.
        disallow: ["/admin/", "/portal/"],
      },
    ],
    sitemap: "https://destinytees.uk/sitemap.xml",
  };
}
