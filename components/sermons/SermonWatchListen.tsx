"use client";

import { useState } from "react";
import type { YTVideo } from "@/lib/youtube";
import type { PodcastEpisode } from "@/lib/podcast";
import { usePodcastPlayer } from "./podcast/PodcastPlayerProvider";
import ModeSwitch from "./podcast/ModeSwitch";
import ListenPane from "./podcast/ListenPane";
import SermonPlayer from "./SermonPlayer";

/**
 * Watch/Listen switch for the sermon detail page — only rendered when
 * `lib/sermonPairing.ts` found a confident audio match for this video.
 * Scoped to just the player area rather than the whole page: the title/meta
 * rows above it are deliberately server-rendered for no-CLS (see
 * app/sermons/[id]/page.tsx) and stay that way regardless of mode.
 */
export default function SermonWatchListen({
  video,
  episode,
}: {
  video: YTVideo;
  episode: PodcastEpisode;
}) {
  const [mode, setMode] = useState<"watch" | "listen">("watch");
  const { toggle, isActive, isPlaying } = usePodcastPlayer();
  const playing = isActive(episode.id) && isPlaying;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ModeSwitch mode={mode} onChange={setMode} />
      </div>
      {mode === "watch" ? (
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          <SermonPlayer videoId={video.id} thumbnail={video.thumbnail} />
        </div>
      ) : (
        <ListenPane
          episode={episode}
          artwork={episode.image}
          playing={playing}
          onToggle={() => toggle(episode)}
        />
      )}
    </div>
  );
}
