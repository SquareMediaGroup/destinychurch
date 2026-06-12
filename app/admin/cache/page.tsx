"use client";

import { useState } from "react";

const PAGES = ["/", "/whats-on", "/sermons", "/new-here"];

export default function AdminCachePage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClear() {
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/revalidate", { method: "POST" });
      setStatus(res.ok ? "done" : "error");
      if (res.ok) setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Clear Cache</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Forces the site to re-fetch fresh data from ChurchSuite and rebuild cached pages.
            Use this after adding or updating events if they aren&apos;t showing up.
          </p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">Pages that will be refreshed</p>
          <ul className="mb-6 flex flex-col gap-2">
            {PAGES.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-destiny-grey/70">
                <span className="material-symbols-rounded text-base text-destiny-orange/60">arrow_right</span>
                <code className="font-mono">{p}</code>
              </li>
            ))}
          </ul>

          {status === "done" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              <span className="material-symbols-rounded text-base">check_circle</span>
              Cache cleared — pages will rebuild on next visit.
            </div>
          )}
          {status === "error" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <span className="material-symbols-rounded text-base">error</span>
              Something went wrong. Try again.
            </div>
          )}

          <button
            onClick={handleClear}
            disabled={status === "loading" || status === "done"}
            className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
          >
            <span className={`material-symbols-rounded text-base ${status === "loading" ? "animate-spin" : ""}`}>
              {status === "loading" ? "progress_activity" : status === "done" ? "check" : "refresh"}
            </span>
            {status === "loading" ? "Clearing…" : status === "done" ? "Done" : "Clear Cache"}
          </button>
        </div>
      </div>
    </div>
  );
}
