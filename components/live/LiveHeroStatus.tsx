"use client";

import { useLiveNow } from "./useLiveNow";

/**
 * The hero eyebrow. Red and pulsing while the stream is up, the site's standard
 * orange eyebrow otherwise — the same slot every other page hero uses, so /live
 * reads as part of the site rather than a separate app.
 */
export default function LiveHeroStatus() {
  const { live } = useLiveNow();

  if (!live) {
    return (
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
        Sundays at 11am
      </p>
    );
  }

  return (
    <p className="mb-4 flex items-center justify-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-destiny-red px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-destiny-red/25">
        <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-white" />
        Live now
      </span>
    </p>
  );
}
