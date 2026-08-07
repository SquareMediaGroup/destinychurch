import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, formatDate } from "@/lib/youtube";
import SermonPlayer from "@/components/sermons/SermonPlayer";
import { SermonJumpProvider } from "@/components/sermons/SermonJumpContext";
import SkipToSermonButton from "@/components/sermons/SkipToSermonButton";
import SermonDescription from "@/components/sermons/SermonDescription";
import ShareButton from "@/components/sermons/ShareButton";
import WatchOnYouTubeBand from "@/components/sermons/WatchOnYouTubeBand";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

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
  const ogImage = `https://i.ytimg.com/vi/${id}/maxresdefault.webp`;
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
    tile: "bg-destiny-orange/10 text-destiny-orange",
  },
  {
    href: "/connect-card",
    icon: "contact_mail",
    label: "Connect Card",
    sub: "We'd love to hear from you",
    tile: "bg-destiny-blue/10 text-destiny-blue",
  },
  {
    href: "/whats-on",
    icon: "event",
    label: "What's On",
    sub: "Don't miss what's next",
    tile: "bg-destiny-purple/10 text-destiny-purple",
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
  // Only the single by-id videos.list call (1 quota unit). We deliberately avoid
  // getAllVideos here (search.list, ~100 units) now that Up Next is gone.
  const video = await getVideo(id);

  if (!video) notFound();

  const date = formatDate(video.publishedAt);
  const sermonStart = parseSermonStart(video.description);
  const displayDescription = stripSermonTimestamp(video.description);

  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: displayDescription.slice(0, 300) || video.title,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.webp`,
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
        // Escape "<" so a title/description containing "</script>" can't
        // break out of the JSON-LD block (video data comes from YouTube).
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoSchema).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-5xl px-4 pb-12 pt-24 lg:px-8">
        {/* Back link + Share */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/sermons"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-destiny-grey/60 transition hover:text-destiny-orange"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            Back to Sermons
          </Link>
          <ShareButton title={video.title} url={`https://destinytees.uk/sermons/${id}`} />
        </div>

        {/* Player — aspect-ratio wrapper reserves space on SSR, eliminating CLS */}
        <SermonJumpProvider sermonStart={sermonStart}>
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <SermonPlayer videoId={video.id} thumbnail={video.thumbnail} />
          </div>

          {/* Title row — server-rendered, no CLS */}
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-2xl font-black leading-snug text-destiny-grey">{video.title}</h1>
            <SkipToSermonButton />
          </div>

          {/* Meta row — server-rendered */}
          <p className="mb-4 mt-1 text-sm text-destiny-grey/55">
            Destiny Church Tees Valley{date && <> &middot; {date}</>}
          </p>
        </SermonJumpProvider>

        {/* Description */}
        {displayDescription && (
          <div className="mb-6">
            <SermonDescription text={displayDescription} />
          </div>
        )}

        {/* Divider */}
        <div className="mb-6 border-t border-black/[0.07]" />

        {/* Action cards */}
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
          What are your next steps?
        </p>
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {actionCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-[20px] border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_16px_36px_-12px_rgba(16,24,40,.16)]"
            >
              <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${card.tile}`}
              >
                <span className="material-symbols-rounded text-2xl">
                  {card.icon}
                </span>
              </div>
              <p className="text-sm font-bold text-destiny-grey">{card.label}</p>
              <p className="mt-0.5 text-xs text-destiny-grey/55">{card.sub}</p>
              <svg
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-destiny-grey/25 transition group-hover:translate-x-1 group-hover:text-destiny-orange"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Watch more on YouTube */}
        <WatchOnYouTubeBand eyebrow="Want to watch more sermons" />
      </div>

      <WorshipWithUsSection />
    </>
  );
}
