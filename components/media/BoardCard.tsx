import Link from "next/link";
import type { MediaBoardSummary } from "@/lib/media.server";

export default function BoardCard({ board }: { board: MediaBoardSummary }) {
  return (
    <Link
      href={`/media/b/${board.slug}`}
      className="group relative block aspect-square overflow-hidden rounded-2xl bg-destiny-grey"
    >
      {board.coverPhotoUrl && board.coverIsVideo ? (
        <video
          src={board.coverPhotoUrl}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : board.coverPhotoUrl ? (
        // Plain <img>: the storage URL has no intrinsic dimensions, which
        // next/image requires. loading/decoding keep it off the critical path.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={board.coverPhotoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-destiny-grey/90">
          <span className="material-symbols-rounded text-4xl text-white/30">photo_library</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-black text-white">{board.title}</p>
        <p className="text-xs font-medium text-white/70">
          {board.photoCount} photo{board.photoCount === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
