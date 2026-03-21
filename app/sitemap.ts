import type { MetadataRoute } from "next";

const BASE_URL = "https://destinytees.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`,             changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/about`,        changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/beliefs`,      changeFrequency: "yearly",  priority: 0.7 },
    { url: `${BASE_URL}/whats-on`,     changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/sermons`,      changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/alpha`,        changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/new-here`,     changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/visit`,        changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/connect`,      changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/connect-card`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/serve`,        changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/give`,         changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/kids`,         changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/youth`,        changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/young-adults`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/contact`,      changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE_URL}/privacy`,      changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/terms`,        changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/data-gdpr`,    changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/safeguarding`, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
