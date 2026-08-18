import type { Metadata } from "next";
import Link from "next/link";
import { getLatestVideo } from "@/lib/youtube";
import AnimateIn from "@/components/AnimateIn";
import LiveStage from "@/components/live/LiveStage";
import LiveChatPanel from "@/components/live/chat/LiveChatPanel";
import LiveHostBar from "@/components/live/LiveHostBar";
import { readHost } from "@/lib/liveChatAuth";
import LiveHeroStatus from "@/components/live/LiveHeroStatus";
import WatchOnYouTubeBand from "@/components/sermons/WatchOnYouTubeBand";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Watch Live",
  description:
    "Watch Destiny Church Tees Valley live, Sundays at 11am — join us online in real time, wherever you are.",
  alternates: { canonical: "/live" },
  openGraph: {
    title: "Watch Live | Destiny Church Tees Valley",
    description: "Join Destiny Church Tees Valley live, Sundays at 11am.",
    url: "https://destinytees.uk/live",
    images: [{ url: "/og/sermons-hero.webp", alt: "Watch Destiny Church live" }],
  },
};

// Never cache the shell: whether we're on air is the entire point of the page,
// and getLiveStatus() already memoises the detection in-process so a dynamic
// render is cheap.
export const dynamic = "force-dynamic";

const serviceFacts = [
  {
    icon: "calendar_month",
    title: "Every Sunday",
    lines: ["Prayer Service: 10:00am – 10:30am", "Main Service: 11:00am – 12:30pm"],
    note: "The stream starts with the main service",
  },
  {
    icon: "live_tv",
    title: "Watch anywhere",
    lines: ["Right here on this page", "Or on our YouTube channel"],
    note: "Chat with us live — no account needed",
  },
  {
    icon: "location_on",
    title: "Rather come along?",
    lines: ["Destiny Centre, 395 Norton Rd", "Stockton-on-Tees, TS20 2QQ"],
    note: "Free on-site parking",
  },
];

const takePart = [
  {
    icon: "waving_hand",
    title: "New here?",
    body: "Watching for the first time? Here's what we believe and what a Sunday looks like.",
    href: "/new-here",
    cta: "Start here",
  },
  {
    icon: "favorite",
    title: "Prayer & connect",
    body: "Send a prayer request or say hello — someone from the team will get back to you.",
    href: "/connect-card",
    cta: "Fill in a connect card",
  },
  {
    icon: "volunteer_activism",
    title: "Give online",
    body: "Everything we do is funded by the generosity of our church family. Thank you.",
    href: "/give",
    cta: "Give now",
  },
];

export default async function LivePage() {
  // The live status itself comes through LiveContext, which the root layout
  // seeds from the same memoised getLiveStatus() call — so this page only needs
  // the fallback content.
  //
  // Host is resolved here rather than fetched by the client so that a visitor
  // pays nothing for a feature they can't see and there is no flash of admin UI
  // while a request resolves. It costs an anonymous visitor nothing either:
  // with no auth cookie, getUser() answers null without a network call. The
  // page is already force-dynamic, so no response is cached across viewers.
  const [latestSermon, host] = await Promise.all([
    getLatestVideo(),
    readHost().catch(() => null),
  ]);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="px-4 pt-8 pb-0 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            aria-hidden
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/WorshipMoment1.webp')" }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/80"
          />

          <div className="relative flex flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
            <AnimateIn>
              <LiveHeroStatus />
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
                Watch Live
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70 md:text-lg">
                Join the service in real time from wherever you are. This page
                switches to the stream the moment we go on air.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {["Sundays 11am", "Free to watch", "Live chat"].map((chip) => (
                  <span
                    key={chip}
                    className="glass glass-sm glass-pill inline-flex items-center px-4 py-2 text-sm font-semibold text-white"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* ── Host controls ────────────────────────────────────── */}
      {/* Renders null for everyone who isn't a signed-in Host. Sits above the
          player so a Host can start or stop a service without leaving the page
          they're checking; see components/live/LiveHostBar.tsx. */}
      <LiveHostBar isHost={Boolean(host)} hostName={host?.name ?? null} />

      {/* ── Player / offline card ────────────────────────────── */}
      {/* The chat sits beside the player on desktop and under it on mobile.
          Flex rather than a fixed two-column grid on purpose: LiveChatPanel
          renders null when we're off air, and a grid template would still hold
          its 380px column open, leaving the offline card narrow with dead space
          beside it. With flex the absent panel reserves nothing and the card
          takes the full width. */}
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <LiveStage latestSermon={latestSermon} />
            </div>
            <LiveChatPanel />
          </div>
        </div>
      </section>

      {/* ── Take part ────────────────────────────────────────── */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Take part from home
            </h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">
              Watching online doesn&apos;t mean watching alone
            </p>
          </AnimateIn>

          <div className="grid gap-6 sm:grid-cols-3">
            {takePart.map((item, i) => (
              <AnimateIn key={item.title} delay={i * 80} className="flex">
                <Link
                  href={item.href}
                  className="group flex w-full flex-col rounded-3xl bg-white p-7 transition hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_12px_28px_-10px_rgba(16,24,40,.16)]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">
                      {item.icon}
                    </span>
                  </div>
                  <p className="mb-2 font-black text-destiny-grey">{item.title}</p>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-destiny-grey/60">
                    {item.body}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-destiny-orange">
                    {item.cta}
                    <span className="material-symbols-rounded text-base transition group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </span>
                </Link>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── When we go live ──────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              When we go live
            </h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">
              Same time every week — and you&apos;re welcome in person too
            </p>
          </AnimateIn>

          <div className="grid gap-6 sm:grid-cols-3">
            {serviceFacts.map((fact, i) => (
              <AnimateIn key={fact.title} delay={i * 80} className="flex">
                <div className="flex w-full items-start gap-4 rounded-3xl bg-[#f5f7fa] p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">
                      {fact.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 font-black text-destiny-grey">{fact.title}</p>
                    {fact.lines.map((line) => (
                      <p key={line} className="text-sm text-destiny-grey/70">
                        {line}
                      </p>
                    ))}
                    <p className="mt-1 text-xs text-destiny-grey/40">{fact.note}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── YouTube band ─────────────────────────────────────── */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <WatchOnYouTubeBand eyebrow="Missed a Sunday?" />
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
