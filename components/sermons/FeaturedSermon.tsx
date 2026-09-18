"use client";

import { useState } from "react";
import Link from "next/link";
import type { PodcastEpisode } from "@/lib/podcast";
import { formatEpisodeDate, formatEpisodeDuration } from "@/lib/podcast";
import type { YTVideo } from "@/lib/youtube";
import { useCookieConsent } from "@/lib/cookieConsent";
import { usePodcastPlayer } from "./podcast/PodcastPlayerProvider";
import ModeSwitch from "./podcast/ModeSwitch";
import ListenPane from "./podcast/ListenPane";
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
  const speaker = video?.speaker ?? episode?.speaker;

  return (
    <div>
      {/* Header — title, meta and the Watch/Listen switch */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Latest message
          </p>
          {speaker && (
            <p className="mt-1 flex items-center gap-1 text-sm font-bold text-muted">
              <span className="material-symbols-rounded text-base text-destiny-orange">person</span>
              {speaker}
            </p>
          )}
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
        <p className="mt-5 text-sm text-subtle">
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

  const iso = mode === "watch" ? video?.publishedAt : episode?.publishedAt;
  const date = iso ? formatEpisodeDate(iso) : "";
  if (date) bits.push(date);

  if (mode === "listen" && episode && episode.durationSeconds > 0) {
    bits.push(formatEpisodeDuration(episode.durationSeconds));
  }

  if (bits.length === 0) return null;

  return (
    <p className="mt-2 text-sm text-subtle">{bits.join(" · ")}</p>
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
