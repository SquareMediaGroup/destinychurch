import Link from "next/link";
import PlaylistCard from "@/components/PlaylistCard";
import { listPublicPlaylists } from "@/lib/playlists";

export const revalidate = 30;
export const runtime = "nodejs";

export default async function PlaylistsPage() {
  const playlists = await listPublicPlaylists();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="subheading text-sm text-destiny-orange">Playlists</p>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Coming soon
        </h1>
        <p className="max-w-2xl text-destiny-grey">
          We&apos;re curating series-based playlists that auto-play every sermon. Check back shortly while we prepare the lineup.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-6 shadow-sm">
        <p className="text-sm font-semibold text-destiny-orange">Playlists coming soon</p>
        <p className="mt-2 text-sm text-destiny-grey">
          We&apos;re assembling full series into continuous playlists. In the meantime, browse sermons below or keep an eye on this page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-destiny-grey">
          <Link
            href="/sermons"
            className="rounded-full bg-destiny-orange px-4 py-2 text-white shadow-sm transition hover:brightness-95"
          >
            Browse sermons
          </Link>
          {playlists.length > 0 && (
            <span className="rounded-full bg-destiny-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-destiny-blue">
              {playlists.length} draft playlist{playlists.length === 1 ? "" : "s"} ready
            </span>
          )}
        </div>
      </div>

      {playlists.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
