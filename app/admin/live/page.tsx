"use client";

/**
 * Simulated Live — schedule a pre-recorded video to play on /live as though it
 * were a broadcast.
 *
 * The controls themselves live in components/live/SimulatedLiveControls.tsx,
 * because the place they actually get used on a Sunday is the Host bar on
 * /live: a Host running a service should not have to leave the page they are
 * watching to start or stop it. This page is the same component pointed at the
 * middleware-gated routes — kept for anyone who prefers driving it from the
 * admin shell, and because it is where the ⌘K palette and the sidebar land.
 */

import Link from "next/link";
import SimulatedLiveControls from "@/components/live/SimulatedLiveControls";

export default function AdminSimulatedLivePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Simulated Live</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Play a pre-recorded video on{" "}
            <Link href="/live" className="font-bold text-destiny-orange hover:underline">
              /live
            </Link>{" "}
            as if it were a live broadcast. Everyone watching sees the same
            moment, and anyone joining part-way through joins part-way through —
            they can&apos;t rewind to the beginning.
          </p>
          <p className="mt-2 text-sm text-destiny-grey/50">
            You can also run all of this from{" "}
            <Link href="/live" className="font-bold text-destiny-orange hover:underline">
              /live
            </Link>{" "}
            itself — the broadcast controls appear at the top of the page when
            you&apos;re signed in as a Host.
          </p>
        </div>

        <SimulatedLiveControls endpoint="/api/admin/simulated-live" />
      </div>
    </div>
  );
}
