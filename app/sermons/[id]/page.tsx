import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, getAllVideos, formatDate, formatViews } from "@/lib/youtube";
import SermonPlayer from "@/components/sermons/SermonPlayer";
import SermonDescription from "@/components/sermons/SermonDescription";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) {
    return { title: "Sermon Not Found" };
  }
  return {
    title: video.title,
    description: video.description.slice(0, 160),
    openGraph: {
      title: `${video.title} | Destiny Church`,
      description: video.description.slice(0, 160),
      url: `https://destinytees.uk/sermons/${id}`,
      images: [{ url: video.thumbnail, alt: video.title }],
    },
  };
}

export const revalidate = 3600;

const actionCards = [
  {
    href: "/give",
    icon: "volunteer_activism",
    label: "Give",
    sub: "Support Destiny Church",
  },
  {
    href: "/connect-card",
    icon: "contact_mail",
    label: "Connect Card",
    sub: "Let us know you're here",
  },
  {
    href: "/new-here",
    icon: "explore",
    label: "Plan a Visit",
    sub: "Join us this Sunday",
  },
];

export default async function SermonPage({ params }: PageProps) {
  const { id } = await params;
  const [video, related] = await Promise.all([getVideo(id), getAllVideos(10)]);

  if (!video) notFound();

  const recommendations = related.filter((v) => v.id !== id).slice(0, 9);
  const date = formatDate(video.publishedAt);
  const views = formatViews(video.viewCount);

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">

          {/* ── Left: player + details ── */}
          <div className="min-w-0 lg:w-[calc(100%-380px)]">
            {/* Back link */}
            <Link
              href="/sermons"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
            >
              <span className="material-symbols-rounded text-base">arrow_back</span>
              Back to Sermons
            </Link>

            {/* Player */}
            <SermonPlayer videoId={video.id} />

            {/* Title */}
            <h1 className="mb-1 mt-4 text-xl font-black text-white">
              {video.title}
            </h1>

            {/* Meta row */}
            <p className="mb-4 text-sm text-white/50">
              Destiny Church Tees Valley
              {date && <> &middot; {date}</>}
              {views && <> &middot; {views}</>}
            </p>

            {/* Divider */}
            <div className="mb-4 border-t border-white/10" />

            {/* Description */}
            {video.description && (
              <div className="mb-6">
                <SermonDescription text={video.description} />
              </div>
            )}

            {/* Divider */}
            <div className="mb-6 border-t border-white/10" />

            {/* Action cards */}
            <div className="flex flex-wrap gap-3">
              {actionCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex flex-1 min-w-[140px] items-center gap-3 rounded-2xl bg-[#272727] p-4 transition hover:bg-[#3f3f3f]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/15">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">
                      {card.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{card.label}</p>
                    <p className="text-xs text-white/40">{card.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Right: recommended ── */}
          <div className="shrink-0 lg:w-[360px]">
            <p className="mb-3 text-sm font-bold text-white/60">Up Next</p>
            <div className="flex flex-col gap-1">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/sermons/${rec.id}`}
                  className="group flex gap-3 rounded-xl p-2 transition hover:bg-[#272727]"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative shrink-0 overflow-hidden rounded-xl"
                    style={{ width: 160, aspectRatio: "16/9" }}
                  >
                    <Image
                      src={rec.thumbnail}
                      alt={rec.title}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  </div>
                  {/* Info */}
                  <div className="flex flex-col justify-center overflow-hidden">
                    <p className="line-clamp-2 text-sm font-bold leading-snug text-white">
                      {rec.title}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {formatDate(rec.publishedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
