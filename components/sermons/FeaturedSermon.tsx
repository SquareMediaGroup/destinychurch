"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PodcastEpisode } from "@/lib/podcast";
import { formatEpisodeDate, formatEpisodeDuration } from "@/lib/podcast";
import type { YTVideo } from "@/lib/youtube";
import { useCookieConsent } from "@/lib/cookieConsent";
import { usePodcastPlayer } from "./podcast/PodcastPlayerProvider";
import VideoConsentGate from "./VideoConsentGate";

/**
 * The latest message, video first.
 *
 * The most recent sermon is the one people come here for, so it leads with the
 * YouTube recording and offers audio as a switch — the rest of the archive is
 * audio-only. `episode` is the podcast pairing from `lib/sermonPairing.ts`; it
 * can be absent (video with no audio yet) and so can `video` (YouTube quota
 * exhausted, or the audio landed first), in which case the toggle is dropped
 * and the card renders whichever half exists.
 *
 * Only the active pane is mounted: unmounting the iframe is what stops video
 * playback when someone switches to audio, and the fixed-ratio wrapper keeps
 * the switch from shifting the page.
 */
export default function FeaturedSermon({
  video,
  episode,
}: {
  video: YTVideo | null;
  episode: PodcastEpisode | null;
}) {
  const canToggle = Boolean(video && episode);
  const [mode, setMode] = useState<"watch" | "listen">(
    video ? "watch" : "listen"
  );

  const { toggle, isActive, isPlaying } = usePodcastPlayer();
  const audioLive = episode ? isActive(episode.id) : false;
  const playing = audioLive && isPlaying;

  // Any episode starting — this one or a row in the archive — means they want
  // to listen. Flipping to Listen unmounts the iframe, which is what stops a
  // video the visitor left playing from talking over the audio. Adjusted during
  // render rather than in an effect so the switch and the pane change in the
  // same commit, with no frame showing the wrong one.
  const [audioWasPlaying, setAudioWasPlaying] = useState(isPlaying);
  if (isPlaying !== audioWasPlaying) {
    setAudioWasPlaying(isPlaying);
    if (isPlaying) setMode("listen");
  }

  const title = episode?.title ?? video?.title ?? "";
  const artwork = episode?.image;

  return (
    <div>
      {/* Header — title, meta and the Watch/Listen switch */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Latest message
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-destiny-grey md:text-4xl">
            {title}
          </h2>
          <Meta video={video} episode={episode} mode={mode} />
        </div>

        {canToggle && <ModeSwitch mode={mode} onChange={setMode} />}
      </div>

      {/* Panes */}
      <div className="mt-7">
        {mode === "watch" && video ? (
          <WatchPane video={video} />
        ) : (
          episode && (
            <ListenPane
              episode={episode}
              artwork={artwork}
              playing={playing}
              onToggle={() => toggle(episode)}
            />
          )
        )}
      </div>

      {video && (
        <p className="mt-5 text-sm text-destiny-grey/55">
          Missed the rest of the service?{" "}
          <Link
            href={`/sermons/${video.id}`}
            className="font-bold text-destiny-orange transition hover:underline"
          >
            Open the full recording
          </Link>
          .
        </p>
      )}
    </div>
  );
}

/* ── Switch ─────────────────────────────────────────────────────────────── */

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: "watch" | "listen";
  onChange: (next: "watch" | "listen") => void;
}) {
  const options: { value: "watch" | "listen"; label: string; icon: string }[] = [
    { value: "watch", label: "Watch", icon: "play_circle" },
    { value: "listen", label: "Listen", icon: "headphones" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Choose video or audio"
      className="inline-flex shrink-0 self-start rounded-full border border-black/[0.07] bg-[#f5f7fa] p-1 sm:self-auto"
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        onChange(mode === "watch" ? "listen" : "watch");
      }}
    >
      {options.map((opt) => {
        const selected = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition ${
              selected
                ? "bg-destiny-orange text-white shadow-sm shadow-destiny-orange/25"
                : "text-destiny-grey/60 hover:text-destiny-grey"
            }`}
          >
            <span className="material-symbols-rounded text-lg">{opt.icon}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Meta line ──────────────────────────────────────────────────────────── */

function Meta({
  video,
  episode,
  mode,
}: {
  video: YTVideo | null;
  episode: PodcastEpisode | null;
  mode: "watch" | "listen";
}) {
  const bits: string[] = [];
  if (episode?.speaker) bits.push(episode.speaker);

  const iso = mode === "watch" ? video?.publishedAt : episode?.publishedAt;
  const date = iso ? formatEpisodeDate(iso) : "";
  if (date) bits.push(date);

  if (mode === "listen" && episode && episode.durationSeconds > 0) {
    bits.push(formatEpisodeDuration(episode.durationSeconds));
  }

  if (bits.length === 0) return null;

  return (
    <p className="mt-2 text-sm text-destiny-grey/55">{bits.join(" · ")}</p>
  );
}

/* ── Watch ──────────────────────────────────────────────────────────────── */

function WatchPane({ video }: { video: YTVideo }) {
  // `consent` is null until the provider has read localStorage on the client,
  // so this is false through SSR and the first render — no hydration mismatch,
  // and no separate mounted flag needed.
  const { consent } = useCookieConsent();
  const canPlay = consent?.media === true;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-black shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)]"
      style={{ aspectRatio: "16/9" }}
    >
      {canPlay ? (
        <iframe
          // youtube-nocookie so nothing is set until playback actually starts.
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <VideoConsentGate
          thumbnail={video.thumbnail}
          sizes="(max-width: 1024px) 100vw, 1100px"
        />
      )}
    </div>
  );
}

/* ── Listen ─────────────────────────────────────────────────────────────── */

function ListenPane({
  episode,
  artwork,
  playing,
  onToggle,
}: {
  episode: PodcastEpisode;
  artwork?: string;
  playing: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="grid gap-6 rounded-2xl border border-black/[0.07] bg-[#f5f7fa] p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:p-7">
      {artwork && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? "Pause the latest message" : "Play the latest message"}
          className="group relative mx-auto w-full max-w-[16rem] overflow-hidden rounded-2xl shadow-lg sm:mx-0 sm:max-w-none"
          style={{ aspectRatio: "1/1" }}
        >
          <Image
            src={artwork}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 640px) 16rem, 14rem"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-destiny-orange shadow-xl">
              <span
                className="material-symbols-rounded text-3xl"
                style={{
                  fontVariationSettings: '"FILL" 1',
                  paddingLeft: playing ? 0 : "3px",
                }}
              >
                {playing ? "pause" : "play_arrow"}
              </span>
            </span>
          </span>
        </button>
      )}

      <div className="min-w-0">
        {episode.summary && (
          <p className="line-clamp-4 text-sm leading-relaxed text-destiny-grey/70">
            {episode.summary}
          </p>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
        >
          <span
            className="material-symbols-rounded text-xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            {playing ? "pause" : "play_arrow"}
          </span>
          {playing ? "Playing" : "Listen now"}
        </button>
      </div>
    </div>
  );
}
