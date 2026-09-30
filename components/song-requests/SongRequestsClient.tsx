"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
}

interface QueueItem extends Track {
  status: "queued" | "played";
}

interface QueueState {
  open: boolean;
  eventName: string;
  playing: Track | null;
  requests: QueueItem[];
}

const DEVICE_KEY = "destiny-song-device";

// Anonymous id so one phone can't fill the queue. Falls back to a per-load id
// if storage is blocked.
function getDeviceId() {
  const make = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32);
  };
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = make();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return make();
  }
}

function Art({ src, size }: { src: string | null; size: number }) {
  return src ? (
    <Image src={src} alt="" width={size} height={size} className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} unoptimized />
  ) : (
    <div className="shrink-0 rounded-lg bg-white/10" style={{ width: size, height: size }} aria-hidden="true" />
  );
}

export default function SongRequestsClient() {
  const [state, setState] = useState<QueueState | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const deviceId = useRef("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/song-requests", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      /* keep the last good state */
    }
  }, []);

  useEffect(() => {
    deviceId.current = getDeviceId();
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError("");
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/song-requests/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setResults(data.tracks);
        setSearchError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSearchError((e as Error).message);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  async function request(track: Track) {
    setPending(track.id);
    setNotice(null);
    try {
      const res = await fetch("/api/song-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id, deviceId: deviceId.current, website: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send your request.");
      setNotice({ kind: "ok", text: `Added "${track.title}" to the queue.` });
      setQuery("");
      setResults([]);
      refresh();
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setPending(null);
    }
  }

  const upNext = state?.requests.filter((r) => r.status === "queued") ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-destiny-orange">Song requests</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{state?.eventName ?? "Request a song"}</h1>

      {state && !state.open ? (
        <p className="mt-6 rounded-2xl bg-white/5 p-5 text-white/70">
          Song requests aren&apos;t open right now. Check back when the event is on.
        </p>
      ) : (
        <>
          <p className="mt-2 text-white/60">Search for a song and add it to the queue. Explicit songs aren&apos;t available.</p>

          <label htmlFor="song-search" className="sr-only">Search for a song or artist</label>
          <input
            id="song-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song or artist"
            autoComplete="off"
            maxLength={100}
            className="mt-6 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 focus:border-destiny-orange focus:outline-none"
          />

          <div role="status" aria-live="polite" className="mt-3 min-h-6 text-sm">
            {notice && <p className={notice.kind === "ok" ? "text-green-400" : "text-red-400"}>{notice.text}</p>}
            {searchError && <p className="text-red-400">{searchError}</p>}
          </div>

          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/5">
              {results.map((t) => (
                <li key={t.id} className="flex items-center gap-3 p-3">
                  <Art src={t.artwork} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{t.title}</p>
                    <p className="truncate text-sm text-white/60">{t.artist}</p>
                  </div>
                  <Button size="sm" loading={pending === t.id} disabled={pending !== null} onClick={() => request(t)}>
                    Request
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && !searchError && (
            <p className="mt-2 text-sm text-white/50">No songs found. Try a different search.</p>
          )}
        </>
      )}

      {state?.playing && (
        <section className="mt-10" aria-label="Now playing">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Now playing</h2>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <Art src={state.playing.artwork} size={56} />
            <div className="min-w-0">
              <p className="truncate font-bold">{state.playing.title}</p>
              <p className="truncate text-sm text-white/60">{state.playing.artist}</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-10" aria-label="Up next">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Up next</h2>
        {upNext.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">Nothing requested yet. Be the first.</p>
        ) : (
          <ol className="mt-3 divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/5">
            {[...upNext].reverse().map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 p-3">
                <span className="w-6 text-center text-sm font-bold text-white/40">{i + 1}</span>
                <Art src={r.artwork} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{r.title}</p>
                  <p className="truncate text-sm text-white/60">{r.artist}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
