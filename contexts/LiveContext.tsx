"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface LiveState {
  live: boolean;
  videoId: string | null;
  title?: string;
}

const defaultState: LiveState = { live: false, videoId: null };

const LiveContext = createContext<LiveState>(defaultState);

export function useLiveStatus() {
  return useContext(LiveContext);
}

export function LiveProvider({
  initial,
  children,
}: {
  initial: LiveState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LiveState>(initial);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/youtube/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as LiveState;
        setState({ live: data.live, videoId: data.videoId, title: data.title });
      } catch {
        // ignore transient failures; keep last known state
      }
    }

    intervalRef.current = setInterval(poll, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}
