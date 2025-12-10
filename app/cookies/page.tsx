"use client";

import Link from "next/link";
import { useState } from "react";
import { useCookieConsent } from "@/lib/cookieConsent";

export default function CookiesPage() {
  const { consent, savePreferences, allowAll, denyOptional } = useCookieConsent();
  const [media, setMedia] = useState(consent?.media ?? false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">Destiny Church Tees Valley</p>
        <h1 className="text-3xl font-bold text-destiny-black">Cookies & Privacy Choices</h1>
        <p className="text-sm text-destiny-grey">
          We use cookies and local storage to deliver video, keep the site secure, and understand how sermons are used.
          Declining optional cookies blocks video playback (YouTube) and disables Cloudflare media embeds.
        </p>
      </div>

      <div className="rounded-xl border border-black/5 bg-destiny-blue/5 p-4 text-sm text-destiny-grey">
        <p className="font-semibold text-destiny-black">What we use</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>YouTube embeds</strong> (videos) set cookies and collect IP/device info when enabled.
          </li>
          <li>
            <strong>Cloudflare</strong> (CDN/security) may set cookies to protect the site and deliver media.
          </li>
          <li>
            <strong>Google Analytics</strong> helps us understand site usage; IP addresses may be processed.
          </li>
          <li>
            <strong>Continue Watching</strong> uses local storage to remember your spot in a sermon.
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-black/5 bg-[var(--surface-muted)] p-4">
          <div>
            <p className="font-semibold text-destiny-black">Essential (required)</p>
            <p className="text-sm text-destiny-grey">Security, site operation, and required preferences.</p>
          </div>
          <span className="rounded-full bg-destiny-grey/10 px-3 py-1 text-xs font-semibold text-destiny-grey">On</span>
        </div>

        <label className="flex items-start justify-between gap-4 rounded-xl border border-black/5 bg-white p-4">
          <div>
            <p className="font-semibold text-destiny-black">Media & embeds (YouTube, Cloudflare)</p>
            <p className="text-sm text-destiny-grey">
              Required for video playback. If off, videos stay blocked and playback tracking is disabled.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-destiny-orange text-destiny-orange"
            checked={media}
            onChange={(e) => setMedia(e.target.checked)}
          />
        </label>

        <label className="flex items-start justify-between gap-4 rounded-xl border border-black/5 bg-white p-4">
          <div>
            <p className="font-semibold text-destiny-black">Analytics (Google Analytics)</p>
            <p className="text-sm text-destiny-grey">
              Helps us understand visits and improve sermons. Includes IP/device information.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-destiny-orange text-destiny-orange"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95"
          onClick={() => savePreferences({ media, analytics })}
        >
          Save preferences
        </button>
        <button
          className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)] transition hover:border-destiny-orange"
          onClick={() => {
            setMedia(true);
            setAnalytics(true);
            allowAll();
          }}
        >
          Allow all
        </button>
        <button
          className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)] transition hover:border-destiny-orange"
          onClick={() => {
            setMedia(false);
            setAnalytics(false);
            denyOptional();
          }}
        >
          Decline optional
        </button>
        <Link href="/" className="text-sm font-semibold text-destiny-orange underline">
          Back to sermons
        </Link>
      </div>
    </div>
  );
}
