import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import ScrollLock from "@/components/sermons/ScrollLock";

export const metadata: Metadata = {
  title: "Sermons — Back Soon",
  description:
    "Our sermons library is getting a refresh. In the meantime, catch every message from Destiny Church Tees Valley on YouTube and Spotify.",
  alternates: { canonical: "/sermons" },
  robots: { index: false, follow: true },
  openGraph: {
    title: "Sermons — Back Soon | Destiny Church Tees Valley",
    description:
      "Our sermons library is getting a refresh. Watch on YouTube or listen on Spotify in the meantime.",
    url: "https://destinytees.uk/sermons",
  },
};

// YouTube channel for Destiny Church.
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@DestinyOnlineChurch";
// Destiny Church Spotify podcast show.
const SPOTIFY_PODCAST_URL =
  "https://open.spotify.com/show/1nj6U60XiQExt8l55E2p0Q";

export default function SermonsMaintenancePage() {
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-20 sm:py-28">
      <ScrollLock />
      {/* Ambient brand glow behind the glass */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 0%, rgba(245,128,33,0.16) 0%, transparent 70%), radial-gradient(45% 45% at 85% 100%, rgba(8,87,186,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Frosted glass card */}
      <AnimateIn className="relative mx-auto w-full max-w-xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-12 text-center shadow-2xl backdrop-blur-xl sm:px-12 sm:py-16">
          {/* Logo */}
          <Image
            src="/img/brand/destiny-logo-color-white.svg"
            alt="Destiny Church Tees Valley"
            width={200}
            height={56}
            className="mx-auto h-11 w-auto opacity-90"
            priority
          />

          {/* Maintenance pill */}
          <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur">
            <span
              className="material-symbols-rounded text-base text-destiny-orange"
              aria-hidden="true"
            >
              construction
            </span>
            Under Maintenance
          </span>

          {/* Heading */}
          <h1 className="mt-6 text-3xl font-black leading-tight text-white sm:text-4xl">
            Our sermons are getting a refresh
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/60">
            We&apos;re rebuilding this page to make it easier to watch and
            listen. While we work, you can still catch every message on our
            YouTube channel and Spotify podcast.
          </p>

          {/* Buttons — site pattern: orange primary + glass secondary */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 sm:w-auto"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.6 15.57V8.43L15.82 12l-6.22 3.57Z" />
              </svg>
              Watch on YouTube
            </a>

            <a
              href={SPOTIFY_PODCAST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-white/30 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/10 sm:w-auto"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0Zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34.35.22.46.69.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.55-1.8c4.37-1.33 9.79-.68 13.5 1.6.44.27.58.85.31 1.29Zm.13-3.4C15.73 8.36 8.4 8.13 4.7 9.26a1.13 1.13 0 1 1-.66-2.16c4.25-1.29 12.35-1.04 16.5 1.42a1.13 1.13 0 0 1-1.15 1.94Z" />
              </svg>
              Listen on Spotify
            </a>
          </div>

          {/* Back to home */}
          <Link
            href="/"
            className="mt-9 inline-flex items-center gap-1.5 text-sm font-semibold text-white/55 transition hover:text-white"
          >
            <span className="material-symbols-rounded text-base" aria-hidden="true">
              arrow_back
            </span>
            Back to home
          </Link>

          {/* Footnote */}
          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-white/30">
            Back online soon &middot; Thanks for your patience
          </p>
        </div>
      </AnimateIn>
    </section>
  );
}
