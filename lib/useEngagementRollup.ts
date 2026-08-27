"use client";

// One hook behind every tab on /admin/analytics that reads engagement_events —
// each tab wants the same shape (range, source, an optional target drill-down,
// a bots toggle) fetched from the same endpoint, so it's one hook rather than
// three copies of the same effect.

import { useEffect, useRef, useState } from "react";
import type { EngagementRollup, EngagementSource } from "@/lib/engagement";

export interface EngagementRollupState {
  data: EngagementRollup | null;
  loading: boolean;
  error: string;
}

export function useEngagementRollup(params: {
  range: string;
  source?: EngagementSource | null;
  target?: string | null;
  includeBots?: boolean;
}): EngagementRollupState {
  const { range, source, target, includeBots } = params;
  const [data, setData] = useState<EngagementRollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Only the newest request may write state — switching tabs or ranges
  // quickly must not let a slow, stale response overwrite a fresher one.
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;

    // The fetch runs inside an async IIFE rather than as a plain top-level
    // `.then()` chain so every setState call — including the initial
    // setLoading(true) — happens inside a callback, not synchronously in the
    // effect body itself.
    void (async () => {
      setLoading(true);

      const query = new URLSearchParams({ range });
      if (source) query.set("source", source);
      if (target) query.set("target", target);
      if (includeBots) query.set("bots", "1");

      try {
        const res = await fetch(`/api/admin/analytics?${query.toString()}`);
        const body = await res.json();
        if (id !== requestId.current) return;
        if (!res.ok) {
          setError(body.error ?? "Couldn't load click data.");
          setData(null);
        } else {
          setError("");
          setData(body as EngagementRollup);
        }
      } catch {
        if (id === requestId.current) setError("Couldn't load click data.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    })();
  }, [range, source, target, includeBots]);

  return { data, loading, error };
}
