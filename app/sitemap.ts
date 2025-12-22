import type { MetadataRoute } from "next";
import { listSermons } from "@/lib/db";
import { listPublicPlaylists } from "@/lib/playlists";
import { getViewId } from "@/lib/viewIds";

const BASE_URL = "https://sermons.destinytees.uk";

const parseLastModified = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/sermons`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/sermons/series`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sermons/guests`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/playlists`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/watch`,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/settings`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let sermons = [] as Awaited<ReturnType<typeof listSermons>>;
  let playlists = [] as Awaited<ReturnType<typeof listPublicPlaylists>>;

  try {
    sermons = await listSermons(500);
  } catch {
    sermons = [];
  }

  try {
    playlists = await listPublicPlaylists(500);
  } catch {
    playlists = [];
  }

  const sermonEntries: MetadataRoute.Sitemap = [];
  const sermonUrls = new Set<string>();

  sermons.forEach((sermon) => {
    const viewId = getViewId(sermon);
    if (!viewId) return;
    const url = `${BASE_URL}/sermons/view?viewId=${encodeURIComponent(viewId)}`;
    if (sermonUrls.has(url)) return;
    sermonUrls.add(url);
    sermonEntries.push({
      url,
      lastModified: parseLastModified(sermon.youtubePubDate ?? sermon.date),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  });

  const playlistEntries: MetadataRoute.Sitemap = [];
  const playlistUrls = new Set<string>();

  playlists.forEach((playlist) => {
    if (!playlist.slug) return;
    const url = `${BASE_URL}/sermons/series/${encodeURIComponent(playlist.slug)}`;
    if (playlistUrls.has(url)) return;
    playlistUrls.add(url);
    playlistEntries.push({
      url,
      lastModified: parseLastModified(playlist.updatedAt ?? playlist.createdAt),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  return [...staticEntries, ...playlistEntries, ...sermonEntries];
}
