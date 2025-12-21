import Image from "next/image";
import Link from "next/link";
import OrangeButton from "@/components/OrangeButton";

export default function NotFound() {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
      <div
        aria-hidden
        className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-destiny-orange/40 via-destiny-red/30 to-destiny-purple/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-28 bottom-[-72px] h-72 w-72 rounded-full bg-gradient-to-br from-destiny-blue/30 via-destiny-green/25 to-destiny-orange/30 blur-3xl"
      />
      <div className="relative grid gap-10 px-6 py-10 md:grid-cols-[1.15fr,0.95fr] lg:px-12 lg:py-14">
        <div className="space-y-5">
          <p className="subheading text-sm text-destiny-orange">
            404 · Off the path
          </p>
          <h1 className="text-4xl font-bold leading-tight text-[var(--foreground)] sm:text-5xl">
            The page or sermon you’re looking for can’t be found.
          </h1>
          <p className="max-w-2xl text-lg text-destiny-grey">
            Sermons, replays, and transcripts are only a tap away. Choose where
            you want to go next and keep exploring.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <OrangeButton href="/">Return home</OrangeButton>
            <Link
              href="/sermons"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
            >
              Browse sermons
              <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Watch live replays",
                desc: "Catch Sunday straight away.",
              },
              {
                title: "Search transcripts",
                desc: "Jump to the moment you need.",
              },
              {
                title: "Follow playlists",
                desc: "Series and guest speakers.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-destiny-grey">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-destiny-orange/15 via-[var(--surface)] to-destiny-blue/10 p-6 shadow-sm">
          <div
            aria-hidden
            className="absolute -left-8 top-6 h-28 w-28 rounded-full bg-gradient-to-br from-destiny-orange/30 via-destiny-red/20 to-transparent blur-2xl"
          />
          <div
            aria-hidden
            className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-gradient-to-br from-destiny-blue/30 via-destiny-green/20 to-transparent blur-2xl"
          />
          <div className="relative flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
            <div className="relative h-12 w-32">
              <Image
                src="/destiny-logo.svg"
                alt="Destiny Church"
                fill
                sizes="128px"
                className="object-contain logo-color"
                priority
              />
              <Image
                src="/destiny-logo-color-white.svg"
                alt="Destiny Church"
                fill
                sizes="128px"
                className="object-contain logo-white"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-destiny-grey">
                Destiny Church
              </p>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Sermons, stories, community.
              </p>
            </div>
          </div>
          <div className="relative mt-6 space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 backdrop-blur">
            {[
              "Fresh message every Sunday night",
              "Summaries you can skim fast",
              "Full transcripts with search",
              "Audio + video without sign-in",
            ].map((detail) => (
              <div key={detail} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-destiny-orange" />
                <p className="text-sm text-[var(--foreground)]">{detail}</p>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-destiny-grey">
                  Next up
                </p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Watch the latest sermon
                </p>
              </div>
              <Link
                href="/sermons"
                className="rounded-full bg-destiny-orange px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
              >
                Play
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
