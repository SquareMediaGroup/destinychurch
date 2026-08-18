"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface LiveState {
  live: boolean;
  videoId: string | null;
  title?: string;
  startedAt?: string;
  scheduledFor?: string;
  /** Pre-uploaded video played as a broadcast rather than an actual stream. */
  simulated?: boolean;
  /** Simulated only: when it goes off air. */
  endsAt?: string;
  /** Simulated only: optional line shown under the player. */
  notice?: string;
  /** Server clock when this answer was produced — see `skew` below. */
  serverTime?: string;
}

const defaultState: LiveState = { live: false, videoId: null };

interface LiveContextValue extends LiveState {
  /** Consecutive polls that came back offline. Reset to 0 by any live answer. */
  offlineStreak: number;
  /**
   * True once a poll has landed, so the server clock is known. A simulated
   * broadcast holds its player back until this flips: mounting the iframe a
   * moment early is cheap, mounting it at the wrong point in the video is not.
   */
  synced: boolean;
  /**
   * Seconds into the video every viewer should be at right now, for a
   * simulated broadcast. Derived from `startedAt` and the *corrected* clock,
   * never from a number the server sent — a number goes stale in a cache or in
   * transit, while `now - startedAt` stays right however long the payload took
   * to arrive.
   */
  getPositionSeconds: () => number;
  /** Re-check now — used when the player reports the broadcast ended. */
  refresh: () => void;
  /**
   * Drop out of the live view immediately, without waiting for a poll. The
   * player's ENDED event knows the stream finished a good half-minute before
   * YouTube's own pages agree.
   */
  markOffline: () => void;
}

const LiveContext = createContext<LiveContextValue>({
  ...defaultState,
  offlineStreak: 0,
  synced: false,
  getPositionSeconds: () => 0,
  refresh: () => {},
  markOffline: () => {},
});

export function useLiveStatus() {
  return useContext(LiveContext);
}

const POLL_MS = 30_000;
/** Negative polls tolerated before the live view is torn down. */
const OFFLINE_GRACE = 2;

export function LiveProvider({
  initial,
  children,
}: {
  initial: LiveState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LiveState>(initial);
  const [offlineStreak, setOfflineStreak] = useState(0);
  const [synced, setSynced] = useState(false);
  const streakRef = useRef(0);
  const pollRef = useRef<() => void>(() => {});

  /**
   * How far this device's clock is from the server's, in milliseconds. Every
   * viewer of a simulated broadcast computes their own position, so if one
   * person's laptop is two minutes fast they would watch two minutes ahead of
   * the chat they are reading. Measured on every poll, which also means it
   * self-corrects if the device clock is adjusted mid-service.
   *
   * The measurement ignores network latency: a round trip is tens of
   * milliseconds against a playhead tolerance of several seconds.
   */
  const skewRef = useRef(0);
  /**
   * The playhead origin, mirrored out of state because `getPositionSeconds`
   * must stay referentially stable — the player reads it on a timer, and a
   * callback that changed identity would re-key the effect that owns the
   * iframe.
   *
   * Written from inside the poll rather than from an effect on `state`. Child
   * effects run before parent ones, so the player's mount effect — which reads
   * the position to decide where to start — would otherwise see the previous
   * broadcast's origin on the very render that put it on screen.
   */
  const startedAtRef = useRef<number | null>(
    initial.startedAt ? Date.parse(initial.startedAt) : null
  );

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState === "hidden") return;
      let data: LiveState;
      try {
        const res = await fetch("/api/youtube/live", { cache: "no-store" });
        if (!res.ok) return;
        data = (await res.json()) as LiveState;
      } catch {
        // Transient failure — hold the last known state rather than flapping.
        // Still mark ourselves synced: an offline device must not leave a
        // simulated player permanently unmounted waiting for a clock.
        if (!cancelled) setSynced(true);
        return;
      }
      if (cancelled) return;

      if (data.serverTime) {
        const server = Date.parse(data.serverTime);
        if (!Number.isNaN(server)) skewRef.current = server - Date.now();
      }
      setSynced(true);

      if (data.live) {
        // Only ever updated from a live answer: the offline grace period keeps
        // a running broadcast on screen through one bad poll, and that player
        // still needs the origin it started against.
        if (data.startedAt) {
          const started = Date.parse(data.startedAt);
          if (!Number.isNaN(started)) startedAtRef.current = started;
        }
        streakRef.current = 0;
        setOfflineStreak(0);
        setState(data);
        return;
      }

      // The streak is counted per poll. The previous version counted it in an
      // effect keyed on `live`, which only re-runs when the boolean flips — so
      // it could never reach two and the handover never happened.
      streakRef.current += 1;
      setOfflineStreak(streakRef.current);
      setState((prev) =>
        prev.live && streakRef.current < OFFLINE_GRACE ? prev : data
      );
    }

    pollRef.current = () => void poll();

    // Poll straight away. The server render can be up to a minute stale, and
    // "we went live 40 seconds ago" is exactly when someone opens this page.
    void poll();
    const id = setInterval(poll, POLL_MS);

    const recheck = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    window.addEventListener("online", recheck);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("online", recheck);
    };
  }, []);

  const refresh = useCallback(() => pollRef.current(), []);

  const getPositionSeconds = useCallback(() => {
    const start = startedAtRef.current;
    if (start === null) return 0;
    return Math.max(0, (Date.now() + skewRef.current - start) / 1000);
  }, []);

  const markOffline = useCallback(() => {
    streakRef.current = OFFLINE_GRACE;
    setOfflineStreak(OFFLINE_GRACE);
    setState((prev) => ({ ...prev, live: false }));
  }, []);

  return (
    <LiveContext.Provider
      value={{
        ...state,
        offlineStreak,
        synced,
        getPositionSeconds,
        refresh,
        markOffline,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
}
