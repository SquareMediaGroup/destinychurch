"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

const INK = "#1a0b2e";

function Art({ src, size, className = "" }: { src: string | null; size: number; className?: string }) {
  const style = { width: size, height: size };
  return src ? (
    <Image src={src} alt="" width={size} height={size} className={`shrink-0 object-cover ${className}`} style={style} unoptimized />
  ) : (
    <div className={`song-stripes shrink-0 ${className}`} style={style} aria-hidden="true" />
  );
}

function Equalizer() {
  return (
    <span className="song-eq flex h-6 items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 0.18}s`, background: INK }} className="w-[5px] rounded-full" />
      ))}
    </span>
  );
}

// Literal class names, so Tailwind can see them.
const sticker = "rounded-3xl border-[3px] border-[#1a0b2e] bg-white shadow-[6px_6px_0_#1a0b2e]";

export default function SongRequestsClient() {
  const [state, setState] = useState<QueueState | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const deviceId = useRef("");

  const secondsLeft = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
  const cooling = secondsLeft > 0;
  const clock = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  // Tick once a second, only while a countdown is running.
  useEffect(() => {
    if (cooldownEnd <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooldownEnd]);

  function startCooldown(seconds: number) {
    setNow(Date.now());
    setCooldownEnd(seconds > 0 ? Date.now() + seconds * 1000 : 0);
  }

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/song-requests?device=${encodeURIComponent(deviceId.current)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        startCooldown(Number(data.cooldown) || 0);
      }
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
      if (typeof data.cooldown === "number") startCooldown(data.cooldown);
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
    <>
      <style>{CSS}</style>
      <div className="relative mx-auto max-w-xl">
        <header className="text-center">
          <Image
            src="/img/brand/destiny-logo-white.svg"
            alt="Destiny Church"
            width={4920}
            height={1080}
            priority
            className="mx-auto mb-7 h-auto w-44 sm:w-52"
          />
          <span className="inline-block -rotate-3 rounded-full border-[3px] border-[#1a0b2e] bg-[#ffd23f] px-4 py-1.5 text-sm font-black uppercase tracking-wider shadow-[4px_4px_0_#1a0b2e]">
            {state?.eventName ?? "Song requests"}
          </span>
          <h1 className="mt-5 text-[2.75rem] font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_4px_0_rgba(26,11,46,0.35)] sm:text-6xl">
            You pick
            <br />
            <span className="inline-block rotate-2 rounded-2xl bg-[#1a0b2e] px-3 py-1 text-[#b8f233]">the tunes!</span>
          </h1>
        </header>

        {state && !state.open ? (
          <div className={`${sticker} mt-10 rotate-1 p-7 text-center`}>
            <span className="material-symbols-rounded song-bounce text-6xl text-[#7c3aed]" aria-hidden="true">bedtime</span>
            <p className="mt-2 text-2xl font-black">Requests are paused</p>
            <p className="mt-1 font-medium text-[#1a0b2e]/70">Song requests aren&apos;t open right now. Keep this page open to see when they reopen.</p>
          </div>
        ) : (
          <>
            <div className="relative mt-9">
              <span className="material-symbols-rounded pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-[#7c3aed]" aria-hidden="true">
                search
              </span>
              <label htmlFor="song-search" className="sr-only">Search for a song or artist</label>
              <input
                id="song-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a song or artist"
                autoComplete="off"
                maxLength={100}
                className="w-full rounded-full border-[3px] border-[#1a0b2e] bg-white py-4 pl-14 pr-5 text-lg font-bold shadow-[6px_6px_0_#1a0b2e] placeholder:font-semibold placeholder:text-[#1a0b2e]/40 focus:outline-none focus:ring-4 focus:ring-[#3ddcff]"
              />
            </div>

            <div
              className={`mt-5 flex items-center justify-center gap-3 rounded-2xl border-[3px] border-[#1a0b2e] px-4 py-3 text-center shadow-[4px_4px_0_#1a0b2e] ${
                cooling ? "bg-[#ffd23f]" : "bg-white"
              }`}
            >
              <span className="material-symbols-rounded text-3xl text-[#7c3aed]" aria-hidden="true">timer</span>
              {cooling ? (
                <p className="text-left font-black leading-tight">
                  Next request in <span className="tabular-nums text-2xl">{clock}</span>
                  <span className="block text-xs font-bold text-[#1a0b2e]/70">One song every 5 minutes per person</span>
                </p>
              ) : (
                <p className="text-left font-black leading-tight">
                  One song every 5 minutes
                  <span className="block text-xs font-bold text-[#1a0b2e]/70">Pick a good one!</span>
                </p>
              )}
            </div>

            <div role="status" aria-live="polite" className="mt-3 min-h-7 text-center">
              {notice && (
                <p
                  className={`song-pop inline-block rounded-2xl border-[3px] border-[#1a0b2e] px-4 py-2 text-sm font-black shadow-[4px_4px_0_#1a0b2e] ${
                    notice.kind === "ok" ? "bg-[#b8f233]" : "bg-[#ffd23f]"
                  }`}
                >
                  {notice.text}
                </p>
              )}
              {searchError && <p className="font-bold text-white">{searchError}</p>}
            </div>

            {searching && results.length === 0 && (
              <p className="mt-3 text-center font-black text-white">Hunting for bangers...</p>
            )}

            {results.length > 0 && (
              <ul className="mt-3 flex flex-col gap-3">
                {results.map((t, i) => (
                  <li key={t.id} className={`${sticker} song-pop flex items-center gap-3 p-2.5 pr-3`} style={{ animationDelay: `${i * 40}ms` }}>
                    <Art src={t.artwork} size={56} className="rounded-2xl border-2 border-[#1a0b2e]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black leading-tight">{t.title}</p>
                      <p className="truncate text-sm font-semibold text-[#1a0b2e]/60">{t.artist}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => request(t)}
                      disabled={pending !== null || cooling}
                      className="song-btn inline-flex shrink-0 items-center gap-1 rounded-full border-[3px] border-[#1a0b2e] bg-[#b8f233] px-4 py-2 text-sm font-black shadow-[3px_3px_0_#1a0b2e] disabled:opacity-60"
                    >
                      <span className="material-symbols-rounded text-xl" aria-hidden="true">
                        {pending === t.id || cooling ? "hourglass_top" : "add"}
                      </span>
                      {pending === t.id ? "Adding" : cooling ? clock : "Request"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!searching && query.trim().length >= 2 && results.length === 0 && !searchError && (
              <p className="mt-3 text-center font-black text-white">Nothing found. Try another search!</p>
            )}
          </>
        )}

        {state?.playing && (
          <section className="mt-12" aria-label="Now playing">
            <h2 className="mb-3 inline-block -rotate-2 rounded-full bg-[#1a0b2e] px-4 py-1 text-sm font-black uppercase tracking-wider text-[#3ddcff]">
              Now playing
            </h2>
            <div className={`${sticker} flex items-center gap-4 bg-[#3ddcff] p-4`}>
              <div className="song-spin relative shrink-0 rounded-full border-[3px] border-[#1a0b2e] bg-[#1a0b2e] p-2">
                <Art src={state.playing.artwork} size={72} className="rounded-full" />
                <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1a0b2e] bg-[#ffd23f]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-black leading-tight">{state.playing.title}</p>
                <p className="truncate font-bold text-[#1a0b2e]/70">{state.playing.artist}</p>
              </div>
              <Equalizer />
            </div>
          </section>
        )}

        <section className="mt-12" aria-label="Up next">
          <h2 className="mb-3 inline-block rotate-1 rounded-full bg-[#ffd23f] px-4 py-1 text-sm font-black uppercase tracking-wider border-[3px] border-[#1a0b2e] shadow-[3px_3px_0_#1a0b2e]">
            Up next
          </h2>
          {upNext.length === 0 ? (
            <div className={`${sticker} -rotate-1 p-6 text-center`}>
              <span className="material-symbols-rounded song-bounce text-5xl text-[#ff3d81]" aria-hidden="true">queue_music</span>
              <p className="mt-1 text-lg font-black">Nothing yet!</p>
              <p className="text-sm font-semibold text-[#1a0b2e]/60">Be the first to request a song.</p>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {upNext.map((r, i) => (
                <li
                  key={`${r.id}-${i}`}
                  className={`${sticker} flex items-center gap-3 p-2.5`}
                  style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-[#1a0b2e] text-lg font-black"
                    style={{ background: ["#ff3d81", "#ffd23f", "#b8f233", "#3ddcff", "#c4a1ff"][i % 5] }}
                  >
                    {i + 1}
                  </span>
                  <Art src={r.artwork} size={48} className="rounded-xl border-2 border-[#1a0b2e]" />
                  <div className="min-w-0">
                    <p className="truncate font-black leading-tight">{r.title}</p>
                    <p className="truncate text-sm font-semibold text-[#1a0b2e]/60">{r.artist}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className="mt-12 text-center text-xs font-semibold text-white/80">
          By using this service you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-white">Terms of Use</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white">Privacy Policy</Link>.
        </footer>
      </div>
    </>
  );
}

// Keyframes and the page background live here so the page stays one component.
// Motion is switched off for anyone who has asked for less of it.
const CSS = `
.song-bg{background-color:#ff7a1a;background-image:radial-gradient(at 12% 8%,#ffb347 0,transparent 50%),radial-gradient(at 88% 12%,#ff5a00 0,transparent 48%),radial-gradient(at 70% 45%,#ff9a3c 0,transparent 55%),radial-gradient(at 8% 60%,#ff6a00 0,transparent 50%),radial-gradient(at 50% 100%,#ffc46b 0,transparent 55%),radial-gradient(at 95% 88%,#ff7a1a 0,transparent 50%)}
.song-bg::before{content:"";position:absolute;inset:0;background:rgba(0,0,0,.4);pointer-events:none}
.song-stripes{background:repeating-linear-gradient(45deg,#ffd23f 0 8px,#ff3d81 8px 16px)}
@keyframes song-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes song-spin{to{transform:rotate(360deg)}}
@keyframes song-pop{0%{opacity:0;transform:scale(.92) translateY(8px)}100%{opacity:1;transform:none}}
@keyframes song-eq{0%,100%{height:20%}50%{height:100%}}
.song-bounce{display:inline-block;animation:song-bounce 1.6s ease-in-out infinite}
.song-spin{animation:song-spin 6s linear infinite}
.song-pop{animation:song-pop .35s ease-out both}
.song-eq span{animation:song-eq .9s ease-in-out infinite}
.song-btn{transition:transform .12s,box-shadow .12s}
.song-btn:hover{transform:translate(-1px,-1px) rotate(-2deg)}
.song-btn:active{transform:translate(3px,3px);box-shadow:0 0 0 #1a0b2e}
@media (prefers-reduced-motion:reduce){.song-bounce,.song-spin,.song-pop,.song-eq span{animation:none}.song-eq span{height:60%}}
`;
