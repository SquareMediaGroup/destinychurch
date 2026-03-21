import Image from "next/image";
import Link from "next/link";
import type { YTVideo } from "@/lib/youtube";
import { formatDate, formatDuration } from "@/lib/youtube";

interface SermonCardProps {
  video: YTVideo;
}

export default function SermonCard({ video }: SermonCardProps) {
  const duration = formatDuration(video.duration);
  const date = formatDate(video.publishedAt);

  return (
    <Link
      href={`/sermons/${video.id}`}
      className="group block"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-2xl shadow-md" style={{ aspectRatio: "16/9" }}>
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Play button overlay — fades in on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition duration-200 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <span className="material-symbols-rounded text-2xl text-destiny-orange" style={{ paddingLeft: "2px" }}>
              play_arrow
            </span>
          </div>
        </div>

        {/* Duration pill */}
        {duration && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-xs font-bold text-white">
            {duration}
          </div>
        )}
      </div>

      {/* Below thumbnail */}
      <div className="mt-3">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-destiny-grey">
          {video.title}
        </h3>
        {date && (
          <p className="mt-1 text-xs text-destiny-grey/50">{date}</p>
        )}
      </div>
    </Link>
  );
}
