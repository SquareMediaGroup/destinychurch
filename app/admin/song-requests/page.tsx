"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminState {
  configured: boolean;
  connection: { accountName: string | null; connectedAt: string } | null;
  device: string | null;
  settings: { open: boolean; event_name: string; max_queue: number; per_device_limit: number };
  requests: { id: string; title: string; artist: string; status: string; createdAt: string }[];
}

const card = "rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5";
const input =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white";

export default function AdminSongRequestsPage() {
  const [data, setData] = useState<AdminState | null>(null);
  const [eventName, setEventName] = useState("");
  const [maxQueue, setMaxQueue] = useState("25");
  const [perDevice, setPerDevice] = useState("3");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/song-requests", { cache: "no-store" });
    if (!res.ok) return;
    const d: AdminState = await res.json();
    setData(d);
    return d;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch seeds the form fields
    load().then((d) => {
      if (!d) return;
      setEventName(d.settings.event_name);
      setMaxQueue(String(d.settings.max_queue));
      setPerDevice(String(d.settings.per_device_limit));
    });
    const spotify = new URLSearchParams(window.location.search).get("spotify");
    const texts: Record<string, string> = {
      connected: "Spotify connected.",
      denied: "Spotify access was not granted.",
      state_mismatch: "That sign-in expired. Please try connecting again.",
      failed: "Couldn't connect to Spotify. Check the app settings and try again.",
      not_configured: "Spotify keys are not set on the server yet.",
    };
    if (spotify && texts[spotify]) {
      if (spotify === "connected") setMessage(texts[spotify]);
      else setError(texts[spotify]);
    }
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/song-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage("Saved.");
      await load();
    } else setError(d.error ?? "Something went wrong");
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch(`/api/admin/song-requests/${id}`, { method: "DELETE" });
    load();
  }

  if (!data) return <div className="p-10 text-sm text-destiny-grey/50 dark:text-white/50">Loading…</div>;
  const { settings } = data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-black text-destiny-grey dark:text-white">Song Requests</h1>
      <p className="mt-1 text-sm text-destiny-grey/50 dark:text-white/50">
        Guests at /song-requests can request clean songs, which go straight into the church Spotify queue.
      </p>

      <div role="status" aria-live="polite" className="mt-4 text-sm">
        {message && <p className="text-green-600 dark:text-green-400">{message}</p>}
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <section className={`${card} mt-4`}>
        <h2 className="font-black text-destiny-grey dark:text-white">Spotify</h2>
        {data.connection ? (
          <p className="mt-2 text-sm text-destiny-grey/70 dark:text-white/70">
            Connected as <strong>{data.connection.accountName ?? "the church account"}</strong>.{" "}
            {data.device ? (
              <>Playing on <strong>{data.device}</strong>.</>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                No active device. Open Spotify on the speaker device and play something, or requests will fail.
              </span>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-destiny-grey/70 dark:text-white/70">
            {data.configured
              ? "Not connected. Sign in with the church's Spotify Premium account."
              : "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not set on the server."}
          </p>
        )}
        {data.configured && (
          // A plain anchor on purpose: next/link would prefetch this redirect.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/api/admin/song-requests/spotify/connect"
            className="mt-3 inline-block rounded-xl bg-destiny-orange px-4 py-2 text-sm font-bold text-white"
          >
            {data.connection ? "Reconnect Spotify" : "Connect Spotify"}
          </a>
        )}
      </section>

      <section className={`${card} mt-4`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-destiny-grey dark:text-white">Requests are {settings.open ? "open" : "closed"}</h2>
            <p className="text-sm text-destiny-grey/50 dark:text-white/50">
              Explicit songs are always blocked.
            </p>
          </div>
          <button
            type="button"
            disabled={saving || (!settings.open && !data.connection)}
            onClick={() => save({ open: !settings.open })}
            className="rounded-xl bg-destiny-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {settings.open ? "Close requests" : "Open requests"}
          </button>
        </div>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            save({ eventName, maxQueue: Number(maxQueue), perDeviceLimit: Number(perDevice) });
          }}
        >
          <label className="text-sm font-bold text-destiny-grey dark:text-white sm:col-span-3">
            Event name
            <input className={`${input} mt-1 font-normal`} value={eventName} maxLength={80} onChange={(e) => setEventName(e.target.value)} />
          </label>
          <label className="text-sm font-bold text-destiny-grey dark:text-white">
            Max songs waiting
            <input className={`${input} mt-1 font-normal`} type="number" min={1} max={200} value={maxQueue} onChange={(e) => setMaxQueue(e.target.value)} />
          </label>
          <label className="text-sm font-bold text-destiny-grey dark:text-white">
            Per person waiting
            <input className={`${input} mt-1 font-normal`} type="number" min={1} max={50} value={perDevice} onChange={(e) => setPerDevice(e.target.value)} />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="rounded-xl border border-black/15 px-4 py-2 text-sm font-bold dark:border-white/20 dark:text-white">
              Save settings
            </button>
          </div>
        </form>
      </section>

      <section className={`${card} mt-4`}>
        <h2 className="font-black text-destiny-grey dark:text-white">Requests</h2>
        <p className="text-sm text-destiny-grey/50 dark:text-white/50">
          Removing a request hides it from the public list. Spotify can&apos;t take a song back out of its queue, so skip it on the device if needed.
        </p>
        {data.requests.length === 0 ? (
          <p className="mt-3 text-sm text-destiny-grey/50 dark:text-white/50">No requests yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
            {data.requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold text-destiny-grey dark:text-white">{r.title}</p>
                  <p className="truncate text-destiny-grey/50 dark:text-white/50">
                    {r.artist} · {r.status} · {new Date(r.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button type="button" onClick={() => remove(r.id)} className="shrink-0 text-xs font-bold text-red-600 dark:text-red-400">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
