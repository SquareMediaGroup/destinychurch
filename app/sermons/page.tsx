import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPodcastShow } from "@/lib/podcast";
import { getLatestVideo } from "@/lib/youtube";
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
  "https://podcasts.apple.com/gb/podcast/destiny-church-tees-valley/id1456522038";
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@DestinyOnlineChurch";

const platforms = [
  { href: SPOTIFY_PODCAST_URL, label: "Spotify", icon: "spotify" },
  { href: APPLE_PODCAST_URL, label: "Apple Podcasts", icon: "apple" },
  { href: YOUTUBE_CHANNEL_URL, label: "YouTube", icon: "youtube" },
];

export default async function SermonsPage() {
  const [show, latestVideo] = await Promise.all([
    getPodcastShow().catch(() => null),
    getLatestVideo().catch(() => null),
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
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#9933CC]" fill="currentColor" aria-hidden>
        <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.59.12 2.2.007 2.864a8.506 8.506 0 01-3.24 5.296c-.608.46-2.096 1.261-2.336 1.261-.088 0-.096-.091-.056-.46.072-.592.144-.715.48-.856.536-.224 1.448-.874 2.008-1.435a7.644 7.644 0 002.008-3.536c.208-.824.184-2.656-.048-3.504-.728-2.696-2.928-4.792-5.624-5.352-.784-.16-2.208-.16-3 0-2.728.56-4.984 2.76-5.672 5.528-.184.752-.184 2.584 0 3.336.456 1.832 1.64 3.512 3.192 4.512.304.2.672.408.824.472.336.144.408.264.472.856.04.36.03.464-.056.464-.056 0-.464-.176-.896-.384l-.04-.03c-2.472-1.216-4.056-3.274-4.632-6.012-.144-.706-.168-2.392-.03-3.04.36-1.74 1.048-3.1 2.192-4.304 1.648-1.737 3.768-2.656 6.128-2.656zm.134 2.81c.409.004.803.04 1.106.106 2.784.62 4.76 3.408 4.376 6.174-.152 1.114-.536 2.03-1.216 2.88-.336.43-1.152 1.15-1.296 1.15-.023 0-.048-.272-.048-.603v-.605l.416-.496c1.568-1.878 1.456-4.502-.256-6.224-.664-.67-1.432-1.064-2.424-1.246-.64-.118-.776-.118-1.448-.008-1.02.167-1.81.562-2.512 1.256-1.72 1.704-1.832 4.342-.264 6.222l.413.496v.608c0 .336-.027.608-.06.608-.03 0-.264-.16-.512-.36l-.034-.011c-.832-.664-1.568-1.842-1.872-2.997-.184-.698-.184-2.024.008-2.72.504-1.878 1.888-3.335 3.808-4.019.41-.145 1.133-.22 1.814-.211zm-.13 2.99c.31 0 .62.06.844.178.488.253.888.745 1.04 1.259.464 1.578-1.208 2.96-2.72 2.254h-.015c-.712-.331-1.096-.956-1.104-1.77 0-.733.408-1.371 1.112-1.745.224-.117.534-.176.844-.176zm-.011 4.728c.988-.004 1.706.349 1.97.97.198.464.124 1.932-.218 4.302-.232 1.656-.36 2.074-.68 2.356-.44.39-1.064.498-1.656.288h-.003c-.716-.257-.87-.605-1.164-2.644-.341-2.37-.416-3.838-.218-4.302.262-.616.974-.966 1.97-.97z" />
      </svg>
    );
  if (name === "youtube")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#FF0000]" fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.6 15.57V8.43L15.82 12l-6.22 3.57Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-destiny-orange" fill="currentColor" aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9h-2.5A6.5 6.5 0 0 0 4 13.5V11Zm0 5a4 4 0 0 1 4 4H4v-4Zm0-9.5C11.46 6.5 17.5 12.54 17.5 20H20C20 11.16 12.84 4 4 4v2.5Z" />
    </svg>
  );
}
