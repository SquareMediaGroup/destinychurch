import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, getAllVideos, formatDate } from "@/lib/youtube";
import SermonPlayer from "@/components/sermons/SermonPlayer";
import SermonDescription from "@/components/sermons/SermonDescription";
import SermonSearchBar from "@/components/sermons/SermonSearchBar";
import ShareButton from "@/components/sermons/ShareButton";
import UpNextSection from "@/components/sermons/UpNextSection";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) {
    return { title: "Sermon Not Found" };
  }
  const desc = video.description.slice(0, 160);
  const ogImage = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  return {
    title: video.title,
    description: desc,
    alternates: { canonical: `/sermons/${id}` },
    openGraph: {
      title: `${video.title} | Destiny Church`,
      description: desc,
      url: `https://destinytees.uk/sermons/${id}`,
      siteName: "Destiny Church",
      type: "video.other",
      images: [
        {
          url: ogImage,
          width: 1280,
          height: 720,
          alt: video.title,
        },
      ],
      videos: [
        {
          url: `https://www.youtube.com/embed/${id}`,
          width: 1280,
          height: 720,
          type: "text/html",
        },
      ],
    },
    twitter: {
      card: "player",
      title: `${video.title} | Destiny Church`,
      description: desc,
      images: [ogImage],
      players: [
        {
          playerUrl: `https://www.youtube.com/embed/${id}`,
          streamUrl: `https://www.youtube.com/embed/${id}`,
          width: 1280,
          height: 720,
        },
      ],
    },
  };
}

export const revalidate = 3600;

const actionCards = [
  {
    href: "/give",
    icon: "volunteer_activism",
    label: "Give",
    sub: "Support the mission",
    color: "#F58021",
  },
  {
    href: "/connect-card",
    icon: "contact_mail",
    label: "Connect Card",
    sub: "We'd love to hear from you",
    color: "#3B82F6",
  },
  {
    href: "/whats-on",
    icon: "event",
    label: "What's On",
    sub: "Don't miss what's next",
    color: "#8B5CF6",
  },
];

const SERMON_TS_RE =
  /sermon\s*(?:starts?\s*(?:at\s*)?)?[@\-]?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i;

/** Look for "Sermon starts at 33:15" or "Sermon @ 1:02:30" etc. in the description */
function parseSermonStart(description: string): number | null {
  const match = description.match(SERMON_TS_RE);
  if (!match) return null;
  const h = match[3] ? Number(match[1]) : 0;
  const m = match[3] ? Number(match[2]) : Number(match[1]);
  const s = match[3] ? Number(match[3]) : Number(match[2]);
  return h * 3600 + m * 60 + s;
}

/** Strip the sermon-timestamp line from the description so viewers don't see it */
function stripSermonTimestamp(description: string): string {
  return description.replace(new RegExp(`^.*${SERMON_TS_RE.source}.*$`, "im"), "").trim();
}

export default async function SermonPage({ params }: PageProps) {
  const { id } = await params;
  const [video, related] = await Promise.all([getVideo(id), getAllVideos(20)]);

  if (!video) notFound();

  const recommendations = related.filter((v) => v.id !== id);
  const date = formatDate(video.publishedAt);
  const sermonStart = parseSermonStart(video.description);
  const displayDescription = stripSermonTimestamp(video.description);

  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: displayDescription.slice(0, 300) || video.title,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    uploadDate: video.publishedAt,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    contentUrl: `https://www.youtube.com/watch?v=${id}`,
    publisher: {
      "@type": "Organization",
      name: "Destiny Church Tees Valley",
      url: "https://destinytees.uk",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        {/* Search bar */}
        <div className="mb-6">
          <SermonSearchBar />
        </div>

        {/* Back link + Share */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/sermons"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            Back to Sermons
          </Link>
          <ShareButton title={video.title} url={`https://destinytees.uk/sermons/${id}`} />
        </div>

        {/* Player */}
        <SermonPlayer videoId={video.id} thumbnail={video.thumbnail} sermonStart={sermonStart} />

        {/* Title */}
        <h1 className="mb-1 mt-4 text-xl font-black text-white">
          {video.title}
        </h1>

        {/* Meta row */}
        <p className="mb-4 text-sm text-white/50">
          Destiny Church Tees Valley
          {date && <> &middot; {date}</>}
        </p>

        {/* Description */}
        {displayDescription && (
          <div className="mb-6">
            <SermonDescription text={displayDescription} />
          </div>
        )}

        {/* Divider */}
        <div className="mb-6 border-t border-white/10" />

        {/* Action cards */}
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/30">What are your Next Steps?</p>
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {actionCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl p-5 transition hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${card.color}22, ${card.color}08)`, border: `1px solid ${card.color}25` }}
            >
              <div
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${card.color}20` }}
              >
                <span className="material-symbols-rounded text-2xl" style={{ color: card.color }}>
                  {card.icon}
                </span>
              </div>
              <p className="text-sm font-bold text-white">{card.label}</p>
              <p className="mt-0.5 text-xs text-white/50">{card.sub}</p>
              <svg
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/50"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Up Next */}
        <UpNextSection videos={recommendations} />
      </div>
    </main>
    </>
  );
}
