import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPodcastShow } from "@/lib/podcast";
import { getLatestVisibleVideo } from "@/lib/sermons";
import { PodcastPlayerProvider } from "@/components/sermons/podcast/PodcastPlayerProvider";
import PodcastHero from "@/components/sermons/podcast/PodcastHero";
import EpisodeList from "@/components/sermons/podcast/EpisodeList";
import WatchOnYouTubeBand from "@/components/sermons/WatchOnYouTubeBand";
import AnimateIn from "@/components/AnimateIn";

export const metadata: Metadata = {
  title: "Sermons & Podcast",
  description:
    "Listen to the DCTV Podcast — every message from Destiny Church Tees Valley. Stream the latest sermons here or watch on YouTube.",
  alternates: { canonical: "/sermons" },
  openGraph: {
    title: "Sermons & Podcast | Destiny Church Tees Valley",
    description:
      "Listen to the DCTV Podcast — every message from Destiny Church Tees Valley.",
    url: "https://destinytees.uk/sermons",
  },
};

export const revalidate = 1800;

const SPOTIFY_PODCAST_URL = "https://open.spotify.com/show/1nj6U60XiQExt8l55E2p0Q";
const APPLE_PODCAST_URL =
  "https://podcasts.apple.com/gb/podcast/destiny-church-tees-valley/id1531676632";
const RSS_URL = "https://feeds.buzzsprout.com/268765.rss";

const platforms = [
  { href: SPOTIFY_PODCAST_URL, label: "Spotify", icon: "spotify" },
  { href: APPLE_PODCAST_URL, label: "Apple Podcasts", icon: "apple" },
  { href: RSS_URL, label: "RSS", icon: "rss" },
];

export default async function SermonsPage() {
  const [show, latestVideo] = await Promise.all([
    getPodcastShow().catch(() => null),
    getLatestVisibleVideo().catch(() => null),
  ]);

  const episodes = show?.episodes ?? [];
  const latest = episodes[0] ?? null;
  const rest = episodes.slice(1);
  const watchHref = latestVideo ? `/sermons/${latestVideo.id}` : null;

  return (
    <PodcastPlayerProvider>
      <main className="relative min-h-screen bg-[#0c0a09] pb-32 text-white">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="px-4 pt-8 pb-0 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl">
            <Image
              src="/img/photos/Bible Image Destiny Church.webp"
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="100vw"
              quality={82}
              className="scale-105 object-cover object-center blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75" />

            <div className="relative flex flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
              <AnimateIn>
                <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
                  Sermons
                </h1>

                <p className="mx-auto mt-4 max-w-xl text-base text-white/70 md:text-lg">
                  Listen to every message from Destiny Church — stream the latest
                  here, or head to YouTube to watch.
                </p>

                {/* Platform chips */}
                <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                  {platforms.map((p) => (
                    <a
                      key={p.label}
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur transition hover:border-white/40 hover:bg-white/20 hover:text-white"
                    >
                      <PlatformIcon name={p.icon} />
                      {p.label}
                    </a>
                  ))}
                </div>
              </AnimateIn>
            </div>
          </section>
        </div>

        {/* ── Featured latest episode ──────────────────────────── */}
        {latest ? (
          <section className="relative mx-auto mt-16 max-w-6xl px-5 sm:mt-20 lg:px-8">
            <AnimateIn>
              <PodcastHero episode={latest} watchHref={watchHref} />
            </AnimateIn>
          </section>
        ) : (
          <section className="relative mx-auto mt-16 max-w-6xl px-5 lg:px-8">
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
              Episodes are loading. Catch every message on{" "}
              <a href={SPOTIFY_PODCAST_URL} className="text-destiny-orange underline">
                Spotify
              </a>{" "}
              meanwhile.
            </p>
          </section>
        )}

        {/* ── Episode archive ──────────────────────────────────── */}
        {rest.length > 0 && (
          <section className="relative mx-auto mt-20 max-w-6xl px-5 sm:mt-28 lg:px-8">
            <EpisodeList episodes={rest} />
          </section>
        )}

        {/* ── YouTube redirect band ────────────────────────────── */}
        <section className="relative mx-auto mt-24 max-w-6xl px-5 sm:mt-32 lg:px-8">
          <WatchOnYouTubeBand />

          <p className="mt-8 text-center text-sm text-white/40">
            Looking for a guest speaker?{" "}
            <Link href="/sermons/guest-speakers" className="font-semibold text-white/70 underline-offset-4 hover:underline">
              Browse guest speakers
            </Link>
          </p>
        </section>
      </main>
    </PodcastPlayerProvider>
  );
}

function PlatformIcon({ name }: { name: string }) {
  if (name === "spotify")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#1DB954]" fill="currentColor" aria-hidden>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0Zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34.35.22.46.69.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.55-1.8c4.37-1.33 9.79-.68 13.5 1.6.44.27.58.85.31 1.29Zm.13-3.4C15.73 8.36 8.4 8.13 4.7 9.26a1.13 1.13 0 1 1-.66-2.16c4.25-1.29 12.35-1.04 16.5 1.42a1.13 1.13 0 0 1-1.15 1.94Z" />
      </svg>
    );
  if (name === "apple")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#A855F7]" fill="currentColor" aria-hidden>
        <path d="M12 1.5a10.5 10.5 0 0 0-3.9 20.24c-.06-.8-.04-1.78.16-2.66.2-.86 1.32-5.6 1.32-5.6a3.6 3.6 0 0 1-.3-1.5c0-1.4.82-2.45 1.83-2.45.86 0 1.28.65 1.28 1.43 0 .87-.56 2.18-.85 3.39-.24 1.02.5 1.85 1.52 1.85 1.82 0 3.04-2.34 3.04-5.12 0-2.11-1.42-3.69-4-3.69-2.92 0-4.74 2.18-4.74 4.61 0 .84.25 1.43.64 1.89.18.21.2.3.14.54-.05.18-.15.6-.2.77-.06.24-.26.33-.48.24-1.34-.55-1.96-2.02-1.96-3.67 0-2.73 2.3-6 6.86-6 3.67 0 6.08 2.65 6.08 5.5 0 3.77-2.1 6.59-5.18 6.59-1.04 0-2.01-.56-2.34-1.2l-.64 2.5c-.23.88-.68 1.77-1.07 2.46A10.5 10.5 0 1 0 12 1.5Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-destiny-orange" fill="currentColor" aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9h-2.5A6.5 6.5 0 0 0 4 13.5V11Zm0 5a4 4 0 0 1 4 4H4v-4Zm0-9.5C11.46 6.5 17.5 12.54 17.5 20H20C20 11.16 12.84 4 4 4v2.5Z" />
    </svg>
  );
}
