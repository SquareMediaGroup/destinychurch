import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import OrangeButton from "@/components/OrangeButton";
import SermonCard from "@/components/SermonCard";
import { listSermons } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const sermons = await listSermons(6);
  const featured = sermons.slice(0, 3);

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-destiny-orange/15 via-[var(--surface)] to-[var(--surface)] px-6 py-10 text-[var(--foreground)] shadow-sm sm:px-10 transition-colors">
        <p className="subheading text-sm text-destiny-orange">Destiny Sermons</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
          Weekly messages, ready to watch
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-destiny-grey">
          Watch Destiny Church sermons with video replays, podcasts,
          AI summaries, and transcripts — no account required.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <OrangeButton href="/sermons">Browse sermons</OrangeButton>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 text-sm font-semibold text-destiny-orange"
          >
            How it works →
          </a>
        </div>
      </section>

      <ContinueWatchingRow sermons={sermons} />

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="subheading text-sm text-destiny-orange">
              Latest sermons
            </p>
            <h2 className="text-2xl font-semibold text-destiny-black">
              Fresh from YouTube + podcast
            </h2>
          </div>
          <OrangeButton className="hidden sm:inline-flex" href="/sermons">
            View all
          </OrangeButton>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-6 text-sm text-destiny-grey">
            No sermons yet. Run the sync to pull the latest 25.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((sermon, index) => (
              <SermonCard
                key={sermon.id}
                sermon={sermon}
                priority={index === 0}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4" id="how-it-works">
        <p className="subheading text-sm text-destiny-orange">How it works</p>
        <h2 className="text-2xl font-semibold text-destiny-black">
          Simple for you, ready when you are
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-black/5 bg-white px-4 py-5 shadow-sm">
            <p className="text-sm font-semibold text-destiny-black">1) Watch</p>
            <p className="mt-2 text-sm text-destiny-grey">
              Every Sunday&apos;s message is ready to watch again — video, audio,
              and a clean viewing page that feels like YouTube.
            </p>
          </div>
          <div className="rounded-xl border border-black/5 bg-white px-4 py-5 shadow-sm">
            <p className="text-sm font-semibold text-destiny-black">
              2) Catch up fast
            </p>
            <p className="mt-2 text-sm text-destiny-grey">
              Skim the short summary or search the transcript to find the moment
              you want to revisit.
            </p>
          </div>
          <div className="rounded-xl border border-black/5 bg-white px-4 py-5 shadow-sm">
            <p className="text-sm font-semibold text-destiny-black">
              3) Continue where you left
            </p>
            <p className="mt-2 text-sm text-destiny-grey">
              Your place is saved on your device. Pause on your phone, pick up
              on your laptop without logging in.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
