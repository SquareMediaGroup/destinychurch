"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveStatus } from "@/contexts/LiveContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { formatCountdown } from "@/lib/serviceTimes";

/**
 * The one part of ServiceTimesBar that can't be server-rendered: "is a
 * service live right now" (a client context, polled) and a relative
 * countdown (needs the visitor's own clock tick).
 *
 * Renders nothing until mounted, then fades in — so a static render (no JS,
 * or the instant before hydration) shows only the day and time from
 * ServiceTimesBar, which is already a complete, correct answer on its own.
 * This is additive, not required, which is what keeps it flash-free: there is
 * no "loading…" state to flash away, only an enhancement appearing.
 */
export default function NextGatheringStatus({ nextIso }: { nextIso: string }) {
  const { live } = useLiveStatus();
  const { reducedMotion } = useAccessibility();
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    const next = new Date(nextIso);

    const tick = () => setCountdown(formatCountdown(next));
    tick();
    // A minute-grain countdown doesn't need a faster tick than that.
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [nextIso]);

  if (live) {
    return (
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-destiny-red">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {/* The ping ring is decorative emphasis, not the signal itself — the
              solid dot plus the "Live now" text already carry the meaning, so
              it's simply dropped rather than animated for reduced-motion. */}
          {!reducedMotion && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destiny-red opacity-75" />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-destiny-red" />
        </span>
        Live now —{" "}
        <Link href="/live" className="underline underline-offset-2">
          watch online
        </Link>
      </p>
    );
  }

  // Nothing to show pre-hydration or once the countdown has expired (the
  // service has started but isn't reporting live yet) — the static day/time
  // in ServiceTimesBar already stands on its own.
  if (!countdown) return null;

  return <p className="mt-0.5 text-sm text-on-dark-subtle">Starts in {countdown}</p>;
}
