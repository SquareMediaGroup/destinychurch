import type { Metadata } from "next";
import Link from "next/link";
import { getPodcastShow } from "@/lib/podcast";
import { getLatestVisibleVideo } from "@/lib/sermons";
import { PodcastPlayerProvider } from "@/components/sermons/podcast/PodcastPlayerProvider";
import PodcastHero from "@/components/sermons/podcast/PodcastHero";
import EpisodeList from "@/components/sermons/podcast/EpisodeList";
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

const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@DestinyOnlineChurch";
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
      <main className="relative min-h-screen overflow-hidden bg-[#0c0a09] pb-32 text-white">
        {/* Ambient glow + grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[70vh]"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(245,128,33,0.18) 0%, transparent 70%), radial-gradient(40% 40% at 85% 10%, rgba(8,87,186,0.12) 0%, transparent 70%)",
          }}
        />

        {/* ── Masthead ─────────────────────────────────────────── */}
        <header className="relative mx-auto max-w-6xl px-5 pt-28 sm:pt-32 lg:px-8">
          <AnimateIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-white/60 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-destiny-orange" />
              {show?.author ?? "DCTV Podcast"}
            </span>

            <h1
              className="mt-6 text-[15vw] font-normal uppercase leading-[0.82] tracking-tight text-white sm:text-[10rem] lg:text-[12rem]"
              style={{ fontFamily: "var(--font-anton)" }}
            >
              Sermons
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/55">
              Every message, anytime. Press play below to listen, or{" "}
              <span className="italic text-white/80" style={{ fontFamily: "var(--font-playfair)" }}>
                head to YouTube
              </span>{" "}
              to watch.
            </p>

            {/* Platform chips */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {platforms.map((p) => (
                <a
                  key={p.label}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-white"
                >
                  <PlatformIcon name={p.icon} />
                  {p.label}
                </a>
              ))}
            </div>
          </AnimateIn>
        </header>

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
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1714] to-[#0f0d0c] px-7 py-12 sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(253,0,0,0.18), transparent 70%)" }}
            />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">
                  Prefer to watch?
                </p>
                <h2
                  className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Every sermon, on the big screen.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-white/55">
                  Our full back-catalogue of services lives on YouTube — worship,
                  testimonies and the full message, all in one place.
                </p>
              </div>

              <a
                href={YOUTUBE_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#0c0a09] shadow-xl transition hover:scale-[1.03]"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#FF0000]" fill="currentColor" aria-hidden>
                  <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.6 15.57V8.43L15.82 12l-6.22 3.57Z" />
                </svg>
                Watch on YouTube
              </a>
            </div>
          </div>

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
