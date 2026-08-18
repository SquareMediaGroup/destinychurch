"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDate, type YTVideo } from "@/lib/youtube";
import LivePlayer from "./LivePlayer";
import NextServiceCountdown from "./NextServiceCountdown";
import { useLiveNow } from "./useLiveNow";

/**
 * The one part of /live that changes with the broadcast: the player while we're
 * on air, an offline card the rest of the week. Everything around it on the page
 * is static and server-rendered.
 */
export default function LiveStage({ latestSermon }: { latestSermon: YTVideo | null }) {
  const {
    live,
    videoId,
    title,
    startedAt,
    scheduledFor,
    simulated,
    notice,
    playerReady,
    getPositionSeconds,
    markOffline,
    refresh,
  } = useLiveNow();

  if (live && videoId) {
    return (
      <LiveNow
        videoId={videoId}
        title={title}
        startedAt={startedAt}
        simulated={simulated}
        notice={notice}
        // A simulated broadcast waits for the first poll to establish the
        // server clock — a fraction of a second, against joining the service at
        // the wrong point for as long as the viewer's device clock is wrong.
        playerReady={playerReady}
        getPositionSeconds={getPositionSeconds}
        onEnded={() => {
          markOffline();
          refresh();
        }}
      />
    );
  }

  // A simulated broadcast that hasn't started yet has a real start time, which
  // beats the standing "next Sunday, 11am" guess — and is often not a Sunday.
  return <Offline latestSermon={latestSermon} scheduledFor={scheduledFor} />;
}

/* ── Live ───────────────────────────────────────────────────────────────── */

function LiveNow({
  videoId,
  title,
  startedAt,
  simulated,
  notice,
  playerReady,
  getPositionSeconds,
  onEnded,
}: {
  videoId: string;
  title?: string;
  startedAt?: string;
  simulated: boolean;
  notice?: string;
  playerReady: boolean;
  getPositionSeconds: () => number;
  onEnded: () => void;
}) {
  // Upload titles read "Message Title || Ps Speaker" — same convention the
  // sermon cards unpick.
  const [heading, ...speakerParts] = (title ?? "Sunday Service").split("||");
  const speaker = speakerParts.join("||").trim();

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-destiny-red">
            <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-destiny-red" />
            On air now
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-destiny-grey md:text-4xl">
            {heading.trim()}
          </h2>
          <p className="mt-2 text-sm text-destiny-grey/55">
            {[speaker, startedAt ? `Started ${formatClockTime(startedAt)}` : null]
              .filter(Boolean)
              .join(" · ") || "Destiny Church Tees Valley"}
          </p>
        </div>

        {/* Off-site only for a real broadcast. Sending someone to YouTube
            mid-simulcast hands them a video with a scrubber and a view count,
            which is a worse experience *and* gives the game away. */}
        {!simulated && (
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border-2 border-black/10 px-5 py-2.5 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange sm:self-auto"
          >
            <span className="material-symbols-rounded text-lg">open_in_new</span>
            Open on YouTube
          </a>
        )}
      </div>

      <div
        className="relative mt-7 w-full overflow-hidden rounded-2xl bg-black shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)]"
        style={{ aspectRatio: "16/9" }}
      >
        {playerReady ? (
          <LivePlayer
            videoId={videoId}
            onEnded={onEnded}
            getTargetTime={simulated ? getPositionSeconds : undefined}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <span
              className="material-symbols-rounded animate-spin text-3xl text-white/30"
              role="status"
              aria-label="Connecting to the stream"
            >
              progress_activity
            </span>
          </div>
        )}
      </div>

      {notice && <p className="mt-5 text-sm text-destiny-grey/55">{notice}</p>}

      <p className="mt-5 text-sm text-destiny-grey/55">
        {simulated ? (
          "Trouble with the stream? Refresh the page — you'll rejoin right where we are."
        ) : (
          <>
            Trouble with the stream? Refresh the page, or{" "}
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-destiny-orange transition hover:underline"
            >
              watch it on YouTube
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}

function formatClockTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date(iso))
      .replace(/\s/g, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

/* ── Offline ────────────────────────────────────────────────────────────── */

function Offline({
  latestSermon,
  scheduledFor,
}: {
  latestSermon: YTVideo | null;
  scheduledFor?: string;
}) {
  const title = latestSermon?.title.split("||")[0].trim();

  return (
    <div className="grid items-center gap-8 rounded-3xl border border-black/[0.07] bg-[#f5f7fa] p-6 sm:p-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
          Off air
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-destiny-grey md:text-4xl">
          We&apos;re not live right now
        </h2>
        <p className="mt-4 text-base leading-relaxed text-destiny-grey/70">
          The stream goes live every Sunday morning and this page switches over
          on its own — no need to refresh. Until then, the latest message is
          ready to watch.
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
            <span className="material-symbols-rounded text-xl text-destiny-orange">
              schedule
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-destiny-grey">Next live service</p>
            <NextServiceCountdown className="mt-0.5" startsAt={scheduledFor} />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/sermons"
            className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-base">play_arrow</span>
            Watch past messages
          </Link>
          <Link
            href="/visit"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black/10 px-6 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            Join us in person
          </Link>
        </div>
      </div>

      {latestSermon ? (
        <Link
          href={`/sermons/${latestSermon.id}`}
          aria-label={`Watch the latest message: ${title}`}
          className="group relative block overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)]"
          style={{ aspectRatio: "16/9" }}
        >
          <Image
            src={latestSermon.thumbnail}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 1024px) 100vw, 520px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
          />
          <span className="absolute left-4 top-4 rounded-full bg-destiny-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
            Latest message
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl transition duration-300 group-hover:scale-110 group-hover:bg-white">
              <span
                className="material-symbols-rounded text-3xl text-destiny-orange"
                style={{ paddingLeft: "3px" }}
              >
                play_arrow
              </span>
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="line-clamp-2 text-base font-black leading-snug text-white">
              {title}
            </p>
            {latestSermon.publishedAt && (
              <p className="mt-1 text-xs text-white/70">
                {formatDate(latestSermon.publishedAt)}
              </p>
            )}
          </div>
        </Link>
      ) : (
        <div
          className="flex items-center justify-center rounded-2xl bg-white"
          style={{ aspectRatio: "16/9" }}
        >
          <div className="text-center">
            <span className="material-symbols-rounded mb-3 block text-5xl text-destiny-grey/25">
              play_circle
            </span>
            <p className="text-sm font-bold text-destiny-grey/40">
              Messages are loading
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
