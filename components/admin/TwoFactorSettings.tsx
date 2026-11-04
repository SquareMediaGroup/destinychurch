"use client";

// The "Two-factor sign-in" card on /admin/profile: how many backup codes are
// left, and "make new backup codes" (which cancels the old ones and shows the
// new 8 once). Setting up and signing in happen on /login/2fa; see
// lib/twoFactor.ts.

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { backupCodesFile } from "@/lib/twoFactor";

export default function TwoFactorSettings({ email }: { email: string | null }) {
  const toast = useToast();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me/two-factor")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { backupCodesRemaining?: number } | null) => setRemaining(d?.backupCodesRemaining ?? null))
      .catch(() => setRemaining(null));
  }, []);

  async function regenerate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/me/two-factor", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { backupCodes?: string[]; error?: string } | null;
      if (!res.ok || !data?.backupCodes) {
        toast.push({ message: data?.error ?? "Couldn't make new backup codes", tone: "error" });
        return;
      }
      setCodes(data.backupCodes);
      setRemaining(data.backupCodes.length);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!codes) return;
    const blob = new Blob([backupCodesFile(codes, email ?? "")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "destiny-church-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-destiny-grey-900">
      <h2 className="text-base font-black text-destiny-grey dark:text-white">Two-factor sign-in</h2>
      <p className="mt-1 text-sm leading-relaxed text-destiny-grey/60 dark:text-white/60">
        On. Signing in needs your password and a code from your authenticator app.
        {remaining !== null && (
          <>
            {" "}
            You have <strong className="text-destiny-grey dark:text-white">{remaining}</strong> unused backup
            code{remaining === 1 ? "" : "s"}.
          </>
        )}
      </p>
      {remaining !== null && remaining <= 2 && !codes && (
        <p className="mt-3 rounded-2xl bg-destiny-orange/10 px-4 py-3 text-sm text-destiny-orange">
          You&apos;re running low on backup codes. Make new ones so you can still get in if you lose your phone.
        </p>
      )}

      {codes ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm font-bold text-destiny-grey dark:text-white">
            Your new backup codes. Save them now: they won&apos;t be shown again, and your old codes no longer work.
          </p>
          <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f5f7fa] p-4 font-mono text-sm tracking-wide text-destiny-grey dark:bg-destiny-grey-800 dark:text-white">
            {codes.map((c) => (
              <li key={c} className="text-center">
                {c}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(codes.join("\n"))
                  .then(() => toast.push({ message: "Backup codes copied", tone: "success" }))
                  .catch(() => undefined)
              }
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold text-destiny-grey transition hover:border-destiny-orange/40 hover:text-destiny-orange dark:border-white/10 dark:text-white"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={download}
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold text-destiny-grey transition hover:border-destiny-orange/40 hover:text-destiny-orange dark:border-white/10 dark:text-white"
            >
              Download
            </button>
            <button
              type="button"
              onClick={() => setCodes(null)}
              className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
            >
              I&apos;ve saved them
            </button>
          </div>
        </div>
      ) : confirming ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="w-full text-sm text-destiny-grey/70 dark:text-white/70">
            Your current backup codes will stop working. Carry on?
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={regenerate}
            className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Making codes..." : "Yes, make new codes"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="rounded-full px-4 py-2 text-xs font-bold text-destiny-grey/50 transition hover:text-destiny-grey dark:text-white/50 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-5 rounded-full border border-black/10 px-4 py-2 text-xs font-bold text-destiny-grey transition hover:border-destiny-orange/40 hover:text-destiny-orange dark:border-white/10 dark:text-white"
        >
          Make new backup codes
        </button>
      )}
    </section>
  );
}
