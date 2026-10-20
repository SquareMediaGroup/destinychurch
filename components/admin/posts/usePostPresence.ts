"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/posts";

const BEAT_MS = 20_000;

/**
 * Who else has this post open. The editor checks in every 20 seconds while
 * it's open and the tab is visible, and says goodbye when it closes; the
 * answer is everyone else seen in the last minute. Polled rather than
 * realtime: "roughly now" is all a heads-up needs.
 */
export function usePostPresence(postId: string | undefined): string[] {
  const [others, setOthers] = useState<string[]>([]);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`${API}/${postId}/editing`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !Array.isArray(data.others)) return;
        const names = [...new Set((data.others as { name: string }[]).map((o) => o.name))];
        setOthers((prev) => (prev.join("|") === names.join("|") ? prev : names));
      } catch {
        // Offline for a moment; the next beat tries again.
      }
    };
    const first = setTimeout(beat, 0);
    const timer = setInterval(beat, BEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
      // keepalive so the goodbye survives the editor closing with the tab.
      void fetch(`${API}/${postId}/editing`, { method: "DELETE", keepalive: true }).catch(() => {});
    };
  }, [postId]);

  return postId ? others : [];
}

/** "Sam is editing" / "Sam and Alex are editing" / "Sam and 2 others are editing". */
export function presenceLine(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is also editing this page.`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are also editing this page.`;
  return `${names[0]} and ${names.length - 1} others are also editing this page.`;
}
