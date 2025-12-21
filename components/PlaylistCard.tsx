import Image from "next/image";
import Link from "next/link";
import { Playlist } from "@/lib/types";

type PlaylistCardProps = {
  playlist: Playlist;
  basePath?: string;
};

export default function PlaylistCard({ playlist, basePath = "/playlists" }: PlaylistCardProps) {
  const firstSermon = playlist.items[0]?.sermon;
  const cover = firstSermon?.thumbnailUrl ?? "/destiny-logo.svg";
  const sermonCount = playlist.items.length;
  const safeBase = basePath.replace(/\/$/, "");

  return (
    <Link
      href={`${safeBase}/${encodeURIComponent(playlist.slug || playlist.id)}`}
      className="group block overflow-hidden rounded-xl border border-black/5 bg-[var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-video overflow-hidden bg-destiny-grey/5">
        <Image
          src={cover}
          alt={playlist.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
        <span className="absolute left-2 top-2 rounded-full bg-destiny-blue px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
          {sermonCount} sermon{sermonCount === 1 ? "" : "s"}
        </span>
        {firstSermon?.title && (
          <span className="absolute bottom-2 left-2 right-2 line-clamp-1 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white">
            Starts with: {firstSermon.title}
          </span>
        )}
      </div>
      <div className="space-y-1.5 px-3.5 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)] line-clamp-2">
          {playlist.title}
        </p>
        <p className="text-xs text-destiny-grey line-clamp-2">
          {playlist.description || "Curated sermons you can play straight through."}
        </p>
      </div>
    </Link>
  );
}
