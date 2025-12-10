import PlaylistCard from "@/components/PlaylistCard";
import { listPublicPlaylists } from "@/lib/playlists";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PlaylistsPage() {
  const playlists = await listPublicPlaylists();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="subheading text-sm text-destiny-orange">Playlists</p>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Binge the whole series
        </h1>
        <p className="max-w-2xl text-destiny-grey">
          Curated, public playlists that string together every message from a series or guest speaker. Start one and it will keep playing.
        </p>
      </header>

      {playlists.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-6 text-sm text-destiny-grey">
          No playlists yet. Admins can create them from the dashboard.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
