"use client";

import { useLiveStatus } from "@/contexts/LiveContext";

/**
 * The single place the "are we live?" rule lives, so the hero badge and the
 * player can never disagree with each other.
 *
 * `LiveProvider` is seeded in the root layout from the same `getLiveStatus()`
 * call this page renders from, so the first paint is already correct — polling
 * only corrects it afterwards. The provider also holds the live view open
 * through a single negative poll, so nothing here needs to second-guess it.
 */
export function useLiveNow() {
  const status = useLiveStatus();

  return {
    live: status.live && Boolean(status.videoId),
    videoId: status.videoId,
    title: status.title,
    startedAt: status.startedAt,
    scheduledFor: status.scheduledFor,
    refresh: status.refresh,
    markOffline: status.markOffline,
  };
}
