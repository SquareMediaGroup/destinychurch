import Image from "next/image";
import Link from "next/link";
import { Sermon } from "@/lib/types";
import { getViewId } from "@/lib/viewIds";

type SermonCardProps = {
  sermon: Sermon;
  priority?: boolean;
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));

const formatDuration = (durationSeconds?: number) => {
  if (!durationSeconds || Number.isNaN(durationSeconds)) return "";
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function SermonCard({ sermon, priority = false }: SermonCardProps) {
  const durationLabel = formatDuration(sermon.durationSeconds);
  const speaker = sermon.speaker || "Destiny Church";
  const href = `/sermons/view?viewId=${encodeURIComponent(getViewId(sermon))}`;

  return (
    <Link
      href={href}
      aria-label={`Watch ${sermon.title} by ${speaker} from ${formatDate(sermon.date)}`}
      className="group block overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm transition-transform duration-500 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-video overflow-hidden bg-destiny-grey/5">
        <Image
          src={sermon.thumbnailUrl}
          alt={sermon.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          fetchPriority={priority ? "high" : undefined}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-90" />
        {durationLabel && (
          <span className="absolute right-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white">
            {durationLabel}
          </span>
        )}
        <span className="absolute left-2 bottom-2 rounded-full bg-destiny-orange px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
          {formatDate(sermon.date)}
        </span>
      </div>
      <div className="space-y-1.5 px-3.5 py-3">
        <p className="text-sm font-semibold text-destiny-black line-clamp-2">
          {sermon.title}
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-destiny-orange">
          {speaker}
        </p>
        <div className="flex flex-wrap gap-1">
          {sermon.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-destiny-blue/10 px-2 py-0.5 text-[11px] font-semibold text-destiny-blue"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
