"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface LiveState {
  live: boolean;
  videoId: string | null;
  title?: string;
  startedAt?: string;
  scheduledFor?: string;
  /** Server clock when this answer was produced. */
  serverTime?: string;
}

const defaultState: LiveState = { live: false, videoId: null };

const LiveContext = createContext<LiveState>(defaultState);

export function useLiveStatus() {
  return useContext(LiveContext);
}

const POLL_MS = 30_000;
/** Negative polls tolerated before the live banner comes down. */
const OFFLINE_GRACE = 2;

export function LiveProvider({
  initial,
  children,
}: {
  initial: LiveState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LiveState>(initial);
  const streakRef = useRef(0);

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
        setState(data);
        return;
      }

      // The streak is counted per poll. The previous version counted it in an
      // effect keyed on `live`, which only re-runs when the boolean flips — so
      // it could never reach two and the handover never happened.
      streakRef.current += 1;
      setState((prev) =>
        prev.live && streakRef.current < OFFLINE_GRACE ? prev : data
      );
    }

    // Poll straight away. The server render can be up to a minute stale, and
    // "we went live 40 seconds ago" is exactly when someone opens the site.
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

  return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}
