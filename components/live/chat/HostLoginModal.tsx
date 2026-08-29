"use client";

// Host sign-in, without leaving the service.
//
// The point of doing this in a modal rather than linking to /login is that a
// Host opens it *during* a service, usually on a phone, often one-handed, while
// the stream is playing behind them. Navigating away means losing the video,
// signing in, coming back and waiting for the player to buffer again. So the
// page stays exactly where it is and only the session changes.
//
// Same gates as the full-page login — rate limit, Supabase password —
// because it is the same server action core (app/login/actions.ts). The only
// difference is the ending: hostSignIn returns instead of redirecting.

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { hostSignIn } from "@/app/login/actions";

const initialState = { success: false, error: undefined as string | undefined };

const inputClass =
  "w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20";
const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45";

export default function HostLoginModal({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Fired after the session lands, so the panel can re-fetch who it's talking to. */
  onSignedIn: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(hostSignIn, initialState);

  useEffect(() => {
    if (!state.success) return;
    // router.refresh() re-runs the server render with the new session cookie;
    // onSignedIn re-fetches /api/live-chat/me so the HOST badge and toolbar
    // appear without a reload.
    router.refresh();
    onSignedIn();
    onClose();
  }, [state.success, router, onSignedIn, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Team sign-in"
      description="For hosts running the chat. You'll stay on this page."
      size="sm"
      closeOnBackdrop={false}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="host-email" className={labelClass}>
            Email
          </label>
          <input
            id="host-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@destinytees.uk"
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="host-password" className={labelClass + " mb-0"}>
              Password
            </label>
            <Link
              href="/admin/forgot-password"
              className="text-xs font-bold text-destiny-orange hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="host-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-destiny-grey/70">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="h-4 w-4 rounded border-black/20 accent-destiny-orange"
          />
          Keep me signed in
        </label>

        {state.error && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-destiny-red/5 px-4 py-3 text-sm text-destiny-red">
            <span className="material-symbols-rounded text-base">error</span>
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-2xl bg-destiny-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs leading-relaxed text-destiny-grey/40">
          Watching the service? You don&apos;t need this — just type your name
          in the chat box to join in.
        </p>
      </form>
    </Modal>
  );
}
