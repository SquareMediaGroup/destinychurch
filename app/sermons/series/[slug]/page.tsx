import Link from "next/link";
import PlaylistViewer from "@/components/PlaylistViewer";
import { getPlaylistBySlugOrId, listPublicPlaylists, slugify } from "@/lib/playlists";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

type SeriesPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<SearchParamsLike> | SearchParamsLike;
};

const getQueryValue = (
  params: SearchParamsLike,
  key: string,
): string => {
  if (!params) return "";
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? "";
  }
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export default async function SeriesPage({ params, searchParams }: SeriesPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const rawSlug = resolvedParams?.slug ?? "";
  const slugWithQuery = rawSlug ? decodeURIComponent(rawSlug).trim() : "";
  const [cleanSlug, queryString = ""] = slugWithQuery.split("?");
  const normalizedSlug = slugify(cleanSlug);
  const idParam = getQueryValue(resolvedSearchParams, "id");
  const idFromSlug = queryString ? new URLSearchParams(queryString).get("id") ?? "" : "";
  const playlistId = idParam || idFromSlug || "";

  const playlistList = await listPublicPlaylists(200);

  const playlist =
    (playlistId ? await getPlaylistBySlugOrId(playlistId) : null) ||
    playlistList.find((p) => {
      const slugVariants = [
        p.slug,
        slugify(p.slug || ""),
        slugify(p.title || ""),
      ].filter(Boolean);
      return (
        slugVariants.some(
          (candidate) =>
            candidate === cleanSlug ||
            candidate === normalizedSlug ||
            candidate.toLowerCase() === cleanSlug.toLowerCase(),
        ) || p.id === cleanSlug
      );
    }) ||
    (await getPlaylistBySlugOrId(cleanSlug)) ||
    (await getPlaylistBySlugOrId(normalizedSlug));

  if (!playlist) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Series not found
          </h1>
          <p className="mt-2 text-destiny-grey">
            We couldn&apos;t load that series. It may be private or the link may be wrong.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/sermons/series"
              className="rounded-full bg-destiny-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              ← All series
            </Link>
            <Link
              href="/sermons"
              className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
            >
              Browse sermons
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const count = playlist.items.length;
  const firstSermon = playlist.items[0]?.sermon;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="subheading text-sm text-destiny-orange">Series</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {playlist.title}
            </h1>
            <p className="max-w-2xl text-destiny-grey">
              {playlist.description || "Play the full series straight through."}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
              {count} sermon{count === 1 ? "" : "s"} · Starts with {firstSermon?.title || "the latest"}
            </p>
          </div>
          <Link
            href="/sermons/series"
            className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            ← All series
          </Link>
        </div>
      </header>

      <PlaylistViewer
        playlistTitle={playlist.title}
        items={playlist.items}
        label="Series"
      />
    </div>
  );
}
