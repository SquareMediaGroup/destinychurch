"use client";

import { useEffect, useState } from "react";
import { getNextAlphaSession } from "@/lib/alphaSession";

// Shared shape returned by /api/alpha-events, the single feed the four course
// pages (Alpha, The Bible Course, Destiny 12:2, CAP Money) all poll for their
// own event type. One row shape serves all four — they only differ in which
// `type` they filter for.
export interface CourseEvent {
  id: string;
  type: string;
  start_date: string;
  signup_url: string;
  location: string | null;
  format?: "in_person" | "online";
  meeting_platform?: "zoom" | "google_meet" | null;
  meeting_url?: string | null;
  meeting_id?: string | null;
  meeting_passcode?: string | null;
  frequency?: string | null;
  custom_interval_days?: number | null;
  active?: boolean;
}

/**
 * Polls the one shared events feed (/api/alpha-events) and keeps only the
 * rows a course page cares about. `matchesType` is the one thing that
 * differs between Alpha, The Bible Course, Destiny 12:2 and CAP Money — the
 * fetch, loading state and error handling are otherwise identical across all
 * four, so they live here once.
 */
export function useCourseEvents(matchesType: (event: CourseEvent) => boolean) {
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      try {
        const res = await fetch("/api/alpha-events");
        const data = await res.json();
        const active = Array.isArray(data)
          ? data.filter((e: CourseEvent) => matchesType(e) && e.active !== false)
          : [];
        if (!cancelled) setEvents(active);
      } catch (err) {
        console.error("Failed to fetch course events:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvents();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, loading };
}

/** The "Starting 12 January 2026" / "Next session 19 January 2026" line every course's signup modal shows. */
export function summarizeCourseSession(event: CourseEvent | null) {
  const sessionInfo = event
    ? getNextAlphaSession(event.start_date, event.frequency, event.custom_interval_days)
    : null;
  const startDateFormatted = sessionInfo
    ? sessionInfo.date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const leadIn = sessionInfo?.isFirst ? "Starting" : "Next session";
  return { sessionInfo, startDateFormatted, subtitle: startDateFormatted ? `${leadIn} ${startDateFormatted}` : undefined };
}
