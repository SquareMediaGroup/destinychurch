"use client";

import { useEffect, useState } from "react";
import { useIsClient } from "@/lib/useIsClient";
import {
  formatCountdown,
  formatServiceDay,
  nextSundayService,
} from "@/lib/serviceTimes";

/**
 * "Next service — Sunday 14 September, 11:00am · in 2 days 4 hours".
 *
 * The date half renders on the server too (it's the same on both sides — the
 * next Sunday doesn't change between render and hydration). The relative half
 * waits for the client, because a countdown computed server-side is wrong by
 * however long the response sat in a cache.
 *
 * `startsAt` overrides the standing Sunday rhythm with a specific instant —
 * a scheduled simulated broadcast, which may well be a Wednesday evening. When
 * it's set the time comes from it rather than being assumed to be 11:00am.
 */
export default function NextServiceCountdown({
  className = "",
  startsAt,
}: {
  className?: string;
  startsAt?: string;
}) {
  const isClient = useIsClient();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // A start time that has already passed is ignored rather than counted down
  // to: /live keeps sending one for the half-minute between a simulated
  // broadcast starting and the next poll noticing.
  const scheduled = startsAt ? new Date(startsAt) : null;
  const usable =
    scheduled && !Number.isNaN(scheduled.getTime()) && scheduled > now
      ? scheduled
      : null;
  const next = usable ?? nextSundayService(now);
  const countdown = isClient ? formatCountdown(next, now) : null;

  return (
    <p className={`text-sm text-destiny-grey/60 ${className}`.trim()}>
      <span className="font-bold text-destiny-grey">
        {formatServiceDay(next)}, {usable ? formatClockTime(usable) : "11:00am"}
      </span>
      {countdown && (
        <>
          {" · "}
          <span>in {countdown}</span>
        </>
      )}
    </p>
  );
}

function formatClockTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\s/g, "")
    .toLowerCase();
}
