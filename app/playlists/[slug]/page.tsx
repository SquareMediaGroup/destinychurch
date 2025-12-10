import Link from "next/link";
import PlaylistViewer from "@/components/PlaylistViewer";
import { getPlaylistBySlugOrId, listPublicPlaylists } from "@/lib/playlists";
import { slugify } from "@/lib/playlists";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlaylistPageProps = {
  params: { slug: string };
};

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const rawSlug = params.slug ?? "";
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";
  const playlistList = await listPublicPlaylists(50);
  const playlist =
    (await getPlaylistBySlugOrId(slug)) ||
    (await getPlaylistBySlugOrId(slugify(slug))) ||
    playlistList.find(
      (p) =>
        p.slug === slug ||
        p.slug === slugify(slug) ||
        p.slug?.toLowerCase() === slug.toLowerCase() ||
        p.id === slug,
    );

  if (!playlist) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Playlist not found</h1>
          <p className="mt-2 text-destiny-grey">
            We couldn&apos;t load that playlist. It may be private or the link may be wrong.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/playlists"
              className="rounded-full bg-destiny-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              ← All playlists
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
        <p className="subheading text-sm text-destiny-orange">Playlist</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {playlist.title}
            </h1>
            <p className="max-w-2xl text-destiny-grey">
              {playlist.description || "Play the full run of this series without stopping."}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
              {count} sermon{count === 1 ? "" : "s"} · Starts with {firstSermon?.title || "the latest"}
            </p>
          </div>
          <Link
            href="/playlists"
            className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            ← All playlists
          </Link>
        </div>
      </header>

      <PlaylistViewer playlistTitle={playlist.title} items={playlist.items} />
    </div>
  );
}
