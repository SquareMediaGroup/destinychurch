import type { MetadataRoute } from "next";

const BASE_URL = "https://destinytees.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/whats-on`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/serve`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/give`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/connect`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/new-here`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
