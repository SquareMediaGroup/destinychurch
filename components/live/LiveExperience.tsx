"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLiveStatus } from "@/contexts/LiveContext";
import type { YTVideo } from "@/lib/youtube";
import LivePlayer from "./LivePlayer";

interface LiveExperienceProps {
  initialLive: boolean;
  initialVideoId: string | null;
  latestSermon: YTVideo | null;
}

export default function LiveExperience({
  initialLive,
  initialVideoId,
  latestSermon,
}: LiveExperienceProps) {
  const status = useLiveStatus();
  const [ended, setEnded] = useState(false);
  const [confirmedOffline, setConfirmedOffline] = useState(false);
  const missRef = useRef(0);

  // Watching: require ENDED event, or two consecutive negative polls,
  // before dropping out of the live view — don't yank the player on one blip.
  useEffect(() => {
    if (status.live) {
      missRef.current = 0;
      setConfirmedOffline(false);
      return;
    }
    missRef.current += 1;
    if (missRef.current >= 2) setConfirmedOffline(true);
  }, [status.live]);

  const videoId = status.videoId ?? initialVideoId;
  const isLive =
    !!videoId && !ended && !confirmedOffline && (status.live || initialLive);

  if (isLive && videoId) {
    return (
      <section className="relative overflow-hidden bg-[#0c0a09] px-6 py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(253,0,0,0.16), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-destiny-red px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Live now
            </span>
          </div>
          <h1
            className="text-center text-4xl leading-none text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-anton)" }}
          >
            SUNDAY LIVE
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-white/55">
            You&apos;re watching Destiny Church Tees Valley live. Welcome in.
          </p>

          <div className="glass glass-strong glass-refract mt-10 overflow-hidden rounded-3xl p-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <LivePlayer videoId={videoId} onEnded={() => setEnded(true)} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <OfflineState endedRecently={ended} latestSermon={latestSermon} />;
}

function OfflineState({
  endedRecently,
  latestSermon,
}: {
  endedRecently: boolean;
  latestSermon: YTVideo | null;
}) {
  return (
    <section className="relative overflow-hidden bg-[#0c0a09] px-6 py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245,128,33,0.14), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-2xl">
        <div className="glass glass-strong glass-refract rounded-3xl px-7 py-12 text-center sm:px-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">
            {endedRecently ? "Stream ended" : "Live stream"}
          </p>
          <h1
            className="mt-3 text-3xl leading-tight text-white sm:text-4xl"
            style={{ fontFamily: "var(--font-anton)" }}
          >
            {endedRecently ? "THANKS FOR JOINING US" : "WE'RE NOT LIVE RIGHT NOW"}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
            {endedRecently
              ? "Catch up on past messages any time, or come back to join us live next Sunday."
              : "We go live every Sunday at 11am. In the meantime, catch up on our latest message."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sermons"
              className="rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              Watch past sermons
            </Link>
            {latestSermon && (
              <Link
                href={`/sermons/${latestSermon.id}`}
                className="glass glass-pill inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white transition hover:border-white/40"
              >
                Latest: {latestSermon.title}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
