import type { Metadata } from "next";
import Link from "next/link";
import PlaylistCard from "@/components/PlaylistCard";
import { listPublicPlaylists } from "@/lib/playlists";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Series",
  description:
    "Play sermon series back to back with automatic playback and curated order.",
};

export default async function SeriesPage() {
  const playlists = await listPublicPlaylists();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="subheading text-sm text-destiny-orange">Series</p>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Watch by series
        </h1>
        <p className="max-w-2xl text-destiny-grey">
          Each series plays in order and moves on automatically when a sermon ends.
        </p>
      </header>

      {playlists.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-6 shadow-sm">
          <p className="text-sm font-semibold text-destiny-orange">
            No series yet
          </p>
          <p className="mt-2 text-sm text-destiny-grey">
            As soon as a series is added in the admin, it will appear here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-destiny-grey">
            <Link
              href="/sermons"
              className="rounded-full bg-destiny-orange px-4 py-2 text-white shadow-sm transition hover:brightness-95"
            >
              Browse sermons
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              basePath="/sermons/series"
              includeIdQuery
            />
          ))}
        </div>
      )}
    </div>
  );
}
