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
 */
export default function NextServiceCountdown({ className = "" }: { className?: string }) {
  const isClient = useIsClient();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const next = nextSundayService(now);
  const countdown = isClient ? formatCountdown(next, now) : null;

  return (
    <p className={`text-sm text-destiny-grey/60 ${className}`.trim()}>
      <span className="font-bold text-destiny-grey">
        {formatServiceDay(next)}, 11:00am
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
