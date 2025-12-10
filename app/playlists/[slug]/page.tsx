import Link from "next/link";
import { notFound } from "next/navigation";
import PlaylistViewer from "@/components/PlaylistViewer";
import { getPlaylistBySlugOrId } from "@/lib/playlists";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlaylistPageProps = {
  params: { slug: string };
};

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const rawSlug = params.slug ?? "";
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";
  const playlist = await getPlaylistBySlugOrId(slug);

  if (!playlist) {
    notFound();
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
