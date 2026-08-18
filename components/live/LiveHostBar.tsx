"use client";

/**
 * Running the broadcast from /live itself.
 *
 * The point is the same one HostLoginModal makes about signing in: a Host does
 * this *during* a service, usually on a phone, often one-handed, while watching
 * the page the congregation is watching. Sending them to /admin/live to start
 * or stop a service means leaving the thing they are trying to check, and it is
 * the moment they can least afford to lose it. So the controls come to the page
 * instead.
 *
 * Visibility is decided on the server. app/live/page.tsx calls readHost() and
 * passes the answer in, which means:
 *   - a visitor never sees this and never pays a request for it;
 *   - there is no flash of admin UI while a fetch resolves;
 *   - the client cannot promote itself — every route behind these controls
 *     re-checks with requireHost() regardless of what this component thinks.
 *
 * Signing in when you aren't already: /live#host opens the same modal the chat
 * panel uses. That escape hatch matters because the chat panel — the only other
 * way in — renders nothing while we're off air, which is exactly when someone
 * needs to schedule next Sunday.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import HostLoginModal from "@/components/live/chat/HostLoginModal";
import { useLiveStatus } from "@/contexts/LiveContext";

/**
 * Loaded only when a Host opens the panel. /live is a public page and this form
 * is a few KB that every visitor would otherwise download to render nothing —
 * the one place lazy-loading is unambiguously right.
 */
const SimulatedLiveControls = dynamic(
  () => import("@/components/live/SimulatedLiveControls"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
          progress_activity
        </span>
      </div>
    ),
  }
);

/** The hash that reveals the sign-in prompt for a Host who isn't signed in. */
const HOST_HASH = "#host";

export default function LiveHostBar({
  isHost,
  hostName,
}: {
  isHost: boolean;
  hostName: string | null;
}) {
  const router = useRouter();
  const { live, simulated, refresh } = useLiveStatus();

  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [wantsHost, setWantsHost] = useState(false);

  // Only ever true because someone typed /live#host. Watched rather than read
  // once so the bar appears without a reload when the hash is added.
  useEffect(() => {
    const check = () => setWantsHost(window.location.hash === HOST_HASH);
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  const afterChange = useCallback(() => {
    // The row changed under /live. Re-poll the status so the player and the
    // banner catch up now rather than up to 30 seconds from now.
    refresh();
    router.refresh();
  }, [refresh, router]);

  if (!isHost) {
    if (!wantsHost) return null;
    return (
      <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/8 bg-[#f5f7fa] p-4">
          <span className="material-symbols-rounded text-xl text-destiny-grey/40">
            lock
          </span>
          <p className="flex-1 text-sm text-destiny-grey/70">
            Sign in as a Host to run the broadcast from this page.
          </p>
          <button
            onClick={() => setSignInOpen(true)}
            className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            Host sign in
          </button>
        </div>
        <HostLoginModal
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          onSignedIn={() => {
            setSignInOpen(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-destiny-orange/25 bg-destiny-orange/[0.04]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
          <span className="material-symbols-rounded text-xl text-destiny-orange">
            settings_input_antenna
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-destiny-grey">
              Broadcast controls
            </p>
            <p className="mt-0.5 text-xs text-destiny-grey/55">
              {hostName ? `Signed in as ${hostName}. ` : ""}
              {describe(live, simulated)}
            </p>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            {open ? "Close" : "Manage service"}
          </button>
        </div>

        {open && (
          <div className="border-t border-destiny-orange/20 bg-white p-4 sm:p-6">
            <SimulatedLiveControls
              endpoint="/api/live-control"
              onSaved={afterChange}
            />
            <p className="mt-6 text-xs text-destiny-grey/45">
              These are the same controls as{" "}
              <Link
                href="/admin/live"
                className="font-bold text-destiny-orange hover:underline"
              >
                /admin/live
              </Link>{" "}
              — the same single service, editable from either place.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** One line telling a Host what the page is currently doing. */
function describe(live: boolean, simulated?: boolean): string {
  if (live && simulated) return "A simulated service is on air.";
  if (live) return "A real YouTube stream is on air — it takes priority.";
  if (simulated) return "A simulated service is scheduled and waiting to start.";
  return "Off air. Nothing is scheduled.";
}
