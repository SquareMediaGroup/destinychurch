"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface LiveState {
  live: boolean;
  videoId: string | null;
  title?: string;
  startedAt?: string;
  scheduledFor?: string;
}

const defaultState: LiveState = { live: false, videoId: null };

interface LiveContextValue extends LiveState {
  /** Consecutive polls that came back offline. Reset to 0 by any live answer. */
  offlineStreak: number;
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
  const streakRef = useRef(0);
  const pollRef = useRef<() => void>(() => {});

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
        return;
      }
      if (cancelled) return;

      if (data.live) {
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

  const markOffline = useCallback(() => {
    streakRef.current = OFFLINE_GRACE;
    setOfflineStreak(OFFLINE_GRACE);
    setState((prev) => ({ ...prev, live: false }));
  }, []);

  return (
    <LiveContext.Provider value={{ ...state, offlineStreak, refresh, markOffline }}>
      {children}
    </LiveContext.Provider>
  );
}
