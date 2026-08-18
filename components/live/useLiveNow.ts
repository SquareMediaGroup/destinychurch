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
 *
 * A simulated broadcast is live in exactly the same sense — the badge, the
 * banner and the chat treat it identically. Only the *player* has an extra
 * condition, `playerReady`: its playhead is measured against the server clock,
 * and the first poll is what supplies that clock, so it waits rather than
 * dropping everyone in at a point derived from an unchecked device clock. Real
 * broadcasts never wait; nothing about them depends on it.
 */
export function useLiveNow() {
  const status = useLiveStatus();

  return {
    live: status.live && Boolean(status.videoId),
    videoId: status.videoId,
    title: status.title,
    startedAt: status.startedAt,
    scheduledFor: status.scheduledFor,
    simulated: Boolean(status.simulated),
    notice: status.notice,
    /** Safe to mount the player: the shared playhead is known. */
    playerReady: !status.simulated || status.synced,
    getPositionSeconds: status.getPositionSeconds,
    refresh: status.refresh,
    markOffline: status.markOffline,
  };
}
