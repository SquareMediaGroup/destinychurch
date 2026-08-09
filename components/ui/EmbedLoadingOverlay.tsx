"use client";

import { useEffect, useState } from "react";
import {
  EMBED_LOADING_STAGES,
  msUntilNextStage,
  stageIndexAt,
} from "@/lib/embedLoading";

/**
 * The spinner-and-copy layer that sits over an embed until its iframe fires
 * `onLoad`, shared by `ChurchSuiteEmbed` (forms) and `MediaEmbed` (video).
 *
 * It stays mounted after the load and fades out, rather than unmounting: the
 * iframe underneath paints its own white/black background immediately, so
 * swapping the overlay out would flash. See `.embed-loading-overlay` in
 * globals.css.
 */
export default function EmbedLoadingOverlay({
  loaded,
  tone = "light",
  fallbackHref,
  fallbackLabel = "Open in a new tab",
}: {
  loaded: boolean;
  /** `dark` for video, which sits on black; `light` for forms, on white. */
  tone?: "light" | "dark";
  /**
   * Where the "open in a new tab" escape hatch points once the last stage is
   * reached. Omit to leave it out — worth having for a form the visitor came
   * to fill in, less so for a video they can watch later.
   */
  fallbackHref?: string;
  fallbackLabel?: string;
}) {
  const stage = useLoadingStage(!loaded);

  return (
    <div
      className={`embed-loading-overlay embed-loading-overlay--${tone}${
        loaded ? " is-loaded" : ""
      }`}
    >
      <div className="embed-spinner" aria-hidden="true" />
      {/* Keyed on the text so React remounts it and the fade replays.
          Announced, not aria-hidden: "taking longer than usual" is the one
          piece of information a screen-reader user has no other way to get
          from an iframe that hasn't painted. Polite, and four updates across
          fourteen seconds, so it informs without talking over anything. */}
      <p key={stage.text} role="status" className="embed-loading-message">
        {stage.text}
      </p>
      {stage.offerFallback && fallbackHref && (
        <a
          href={fallbackHref}
          target="_blank"
          rel="noopener noreferrer"
          className="embed-loading-fallback"
        >
          {fallbackLabel}
        </a>
      )}
    </div>
  );
}

/**
 * The stage for how long the embed has been loading, advancing on a timer.
 *
 * Restarts whenever `active` goes back to true, so a modal reopened onto a
 * fresh iframe starts at "Loading" rather than wherever it left off.
 */
function useLoadingStage(active: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setIndex(stageIndexAt(elapsed));
      const wait = msUntilNextStage(elapsed);
      if (wait !== null) timer = setTimeout(tick, wait);
    };

    // Deferred rather than called straight through: stage 0 is already the
    // initial state, so running it here would only re-set what's rendered —
    // a synchronous setState in an effect, and a cascading render for
    // nothing. The 0ms hop also re-derives the stage if `active` ever goes
    // back to true on a live overlay, which unmounting normally handles.
    timer = setTimeout(tick, 0);

    return () => clearTimeout(timer);
  }, [active]);

  return EMBED_LOADING_STAGES[index];
}
