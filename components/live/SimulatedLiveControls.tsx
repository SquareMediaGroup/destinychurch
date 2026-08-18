"use client";

/**
 * The simulated-live controls — the whole form, once.
 *
 * Mounted in two places: `/admin/live` (the full-page version) and the Host bar
 * on `/live` itself, which is where it actually gets used on a Sunday. They
 * differ only in `endpoint`, because the route that hangs off the public page
 * has to authorise itself while the admin one is covered by middleware.
 *
 * Everything on this form resolves to two saved values: a video and a start
 * time. The rest is either derived (the runtime, which decides when it goes off
 * air) or presentation (title, notice). The status strip is the important part:
 * it is the only place that answers "is it actually on right now, and where has
 * it got to", which is what someone standing at the back of the room with a
 * phone needs to know.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatCountdown } from "@/lib/serviceTimes";
import {
  formatTimecode,
  parseYouTubeId,
  simulatedPhase,
  simulatedPosition,
  type SimulatedLiveConfig,
  type SimulatedPhase,
} from "@/lib/simulatedLive";

interface Loaded extends SimulatedLiveConfig {
  phase: SimulatedPhase;
  endsAt: string | null;
  serverTime: string;
}

interface Preview {
  videoId: string;
  title: string | null;
  durationSeconds: number | null;
  thumbnail: string | null;
  unreadable?: boolean;
}

export interface SimulatedLiveControlsProps {
  /**
   * Base path for the three calls (GET/PUT/DELETE here, `${endpoint}/lookup`
   * for the link preview). `/api/admin/simulated-live` from the admin page,
   * `/api/live-control` from the Host bar on /live.
   */
  endpoint: string;
  /** Called after any successful write, so /live can re-read its own status. */
  onSaved?: () => void;
}

export default function SimulatedLiveControls({
  endpoint,
  onSaved,
}: SimulatedLiveControlsProps) {
  const [video, setVideo] = useState("");
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [looking, setLooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // The server's clock minus this browser's. /live syncs every viewer's
  // playhead against the server, so the readout here has to be measured the
  // same way or it would disagree with what the congregation is watching.
  const skewRef = useRef(0);
  const [tick, setTick] = useState(0);

  const applyLoaded = useCallback((data: Loaded) => {
    setActive(data.active);
    setVideo(data.videoId ?? "");
    setTitle(data.title ?? "");
    setNotice(data.notice ?? "");
    setStartsAtLocal(toLocalInput(data.startsAt));
    setDurationSeconds(data.durationSeconds);
    setConfirmingRemove(false);
    if (data.serverTime) {
      const server = Date.parse(data.serverTime);
      if (!Number.isNaN(server)) skewRef.current = server - Date.now();
    }
    setPreview(
      data.videoId
        ? {
            videoId: data.videoId,
            title: data.title,
            durationSeconds: data.durationSeconds,
            thumbnail: `/api/youtube/thumbnail/${data.videoId}`,
          }
        : null
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Loaded & { error?: string }) => {
        if (!cancelled && !data?.error) applyLoaded(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, applyLoaded]);

  // One second, because the readout counts down to a start time and up through
  // a running service.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const videoId = parseYouTubeId(video);

  async function lookUp(raw: string) {
    const value = raw.trim();
    if (!value) {
      setPreview(null);
      setDurationSeconds(null);
      return;
    }
    setLooking(true);
    setError("");
    try {
      const res = await fetch(
        `${endpoint}/lookup?url=${encodeURIComponent(value)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setPreview(null);
        setError(data.error ?? "Couldn't read that video.");
        return;
      }
      setPreview(data as Preview);
      if (data.durationSeconds) setDurationSeconds(data.durationSeconds);
      // The upload's own name is a starting point, not the final word — it's
      // often written for the archive rather than for the congregation.
      if (data.title && !title.trim()) setTitle(data.title.trim());
    } catch {
      setError("Couldn't reach YouTube. Check the connection and try again.");
    } finally {
      setLooking(false);
    }
  }

  async function save(overrides?: { active?: boolean; startsAtLocal?: string }) {
    const nextActive = overrides?.active ?? active;
    const nextStart = overrides?.startsAtLocal ?? startsAtLocal;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: nextActive,
          video,
          title,
          notice,
          startsAt: fromLocalInput(nextStart),
          durationSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      applyLoaded(data as Loaded);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    } catch {
      setError("Couldn't save. Check the connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  /** Switch on and start immediately — the "we're ready, go" button. */
  async function startNow() {
    const now = toLocalInput(new Date().toISOString());
    setStartsAtLocal(now);
    setActive(true);
    await save({ active: true, startsAtLocal: now });
  }

  /** Clear the row entirely. Two taps, because it throws away what was typed. */
  async function remove() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't remove it.");
        return;
      }
      applyLoaded(data as Loaded);
      onSaved?.();
    } catch {
      setError("Couldn't remove it. Check the connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const draft: SimulatedLiveConfig = {
    active,
    videoId,
    title: title || null,
    startsAt: fromLocalInput(startsAtLocal),
    durationSeconds,
    notice: notice || null,
  };
  // Recomputed on every tick — `tick` is read so the linter and the reader both
  // see why this component re-renders once a second.
  void tick;
  const now = Date.now() + skewRef.current;
  const phase = simulatedPhase(draft, now);
  const position = simulatedPosition(draft, now);
  const hasSomething = Boolean(videoId || startsAtLocal || title || notice);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-6"
    >
      <StatusStrip phase={phase} position={position} draft={draft} now={now} />

      {/* Video */}
      <div>
        <label htmlFor="sl-video" className="block text-sm font-black text-destiny-grey">
          YouTube video
        </label>
        <p className="mt-1 text-xs text-destiny-grey/50">
          Paste a link or an ID. Public and unlisted videos both work; private
          ones don&apos;t — the embed refuses to play them.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            id="sl-video"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            onBlur={(e) => void lookUp(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-w-0 flex-1 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange"
          />
          <button
            type="button"
            onClick={() => void lookUp(video)}
            disabled={looking || !video.trim()}
            className="shrink-0 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange disabled:opacity-40"
          >
            {looking ? "Checking…" : "Check"}
          </button>
        </div>
        {video.trim() && !videoId && (
          <p className="mt-2 text-xs font-bold text-destiny-red">
            That doesn&apos;t look like a YouTube link or video ID.
          </p>
        )}

        {preview && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3">
            {preview.thumbnail ? (
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black/5">
                <Image
                  src={preview.thumbnail}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-black/5">
                <span className="material-symbols-rounded text-xl text-destiny-grey/30">
                  movie
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-destiny-grey">
                {preview.title ?? preview.videoId}
              </p>
              <p className="mt-0.5 text-xs text-destiny-grey/50">
                {durationSeconds
                  ? `Runs ${formatTimecode(durationSeconds)}`
                  : "Runtime unknown — enter it below"}
              </p>
            </div>
          </div>
        )}

        {preview?.unreadable && (
          <p className="mt-2 text-xs text-destiny-grey/60">
            YouTube wouldn&apos;t describe this video — it may be private, or the
            API key may be out of quota. If it plays, it will still work; enter
            the runtime by hand so the page knows when to go off air.
          </p>
        )}
      </div>

      {/* Runtime — only needed when the lookup couldn't supply it */}
      {(!durationSeconds || preview?.unreadable) && (
        <div>
          <label
            htmlFor="sl-duration"
            className="block text-sm font-black text-destiny-grey"
          >
            Runtime
          </label>
          <p className="mt-1 text-xs text-destiny-grey/50">
            In minutes. This is what tells /live when the service is over.
          </p>
          <input
            id="sl-duration"
            type="number"
            min={1}
            max={1440}
            value={durationSeconds ? Math.round(durationSeconds / 60) : ""}
            onChange={(e) => {
              const minutes = Number(e.target.value);
              setDurationSeconds(
                Number.isFinite(minutes) && minutes > 0
                  ? Math.round(minutes * 60)
                  : null
              );
            }}
            className="mt-2 w-32 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange"
          />
        </div>
      )}

      {/* Start time */}
      <div>
        <label
          htmlFor="sl-startsAt"
          className="block text-sm font-black text-destiny-grey"
        >
          Starts at
        </label>
        <p className="mt-1 text-xs text-destiny-grey/50">
          Your device&apos;s time zone. Viewers are placed at <em>now minus this</em>,
          so it&apos;s the one value that has to be right.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="sl-startsAt"
            type="datetime-local"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange"
          />
          <button
            type="button"
            onClick={() => setStartsAtLocal(toLocalInput(new Date().toISOString()))}
            className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            Set to now
          </button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="sl-title" className="block text-sm font-black text-destiny-grey">
          Broadcast title
        </label>
        <p className="mt-1 text-xs text-destiny-grey/50">
          The heading above the player. Same convention as an upload:{" "}
          <span className="font-mono">Message Title || Ps Speaker</span>.
        </p>
        <input
          id="sl-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Sunday Service"
          className="mt-2 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange"
        />
      </div>

      {/* Notice */}
      <div>
        <label htmlFor="sl-notice" className="block text-sm font-black text-destiny-grey">
          Notice under the player{" "}
          <span className="font-normal text-destiny-grey/40">(optional)</span>
        </label>
        <p className="mt-1 text-xs text-destiny-grey/50">
          Leave blank for a plain live experience, or use it to say what this is —
          &ldquo;Recorded at our 11am service&rdquo;.
        </p>
        <input
          id="sl-notice"
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          maxLength={200}
          className="mt-2 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange"
        />
      </div>

      {/* On air */}
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/8 bg-white p-4">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-destiny-orange"
        />
        <span>
          <span className="block text-sm font-black text-destiny-grey">
            Schedule this broadcast
          </span>
          <span className="mt-0.5 block text-xs text-destiny-grey/55">
            /live switches over on its own at the start time and switches back
            when the video runs out. A real YouTube stream always takes priority,
            so this can&apos;t hide an actual service.
          </span>
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-destiny-red/10 px-4 py-3 text-sm font-bold text-destiny-red">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => void startNow()}
          disabled={saving || !videoId || !durationSeconds}
          className="rounded-full border-2 border-black/10 px-6 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange disabled:opacity-40"
        >
          Start now
        </button>
        {active && (
          <button
            type="button"
            onClick={() => {
              setActive(false);
              void save({ active: false });
            }}
            disabled={saving}
            className="rounded-full px-4 py-3 text-sm font-bold text-destiny-red transition hover:underline disabled:opacity-40"
          >
            Take off air
          </button>
        )}
        {saved && <span className="text-sm font-bold text-green-600">Saved</span>}
      </div>

      {/* Remove — clears the row rather than just switching it off, so next
          week doesn't start from last week's half-remembered settings. */}
      {hasSomething && (
        <div className="border-t border-black/8 pt-4">
          {confirmingRemove ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-destiny-grey/70">
                Remove this service and clear every field?
              </span>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={saving}
                className="rounded-full bg-destiny-red px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                Yes, remove it
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRemove(false)}
                className="rounded-full px-3 py-2 text-sm font-bold text-destiny-grey/60 transition hover:text-destiny-grey"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              className="text-sm font-bold text-destiny-grey/50 transition hover:text-destiny-red"
            >
              Remove this service
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/* ── Status ──────────────────────────────────────────────────────────────── */

function StatusStrip({
  phase,
  position,
  draft,
  now,
}: {
  phase: SimulatedPhase;
  position: number;
  draft: SimulatedLiveConfig;
  now: number;
}) {
  const runtime = draft.durationSeconds ?? 0;

  if (phase === "airing") {
    return (
      <div className="rounded-2xl border border-destiny-red/20 bg-destiny-red/5 p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-destiny-red">
          <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-destiny-red" />
          On air now
        </p>
        <p className="mt-2 text-sm font-black text-destiny-grey">
          {formatTimecode(position)} of {formatTimecode(runtime)}
        </p>
        <p className="mt-0.5 text-xs text-destiny-grey/55">
          {formatTimecode(Math.max(0, runtime - position))} left. Everyone
          watching is at this point.
        </p>
      </div>
    );
  }

  if (phase === "scheduled" && draft.startsAt) {
    const inMs = Date.parse(draft.startsAt) - now;
    return (
      <div className="rounded-2xl border border-destiny-orange/25 bg-destiny-orange/5 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
          Scheduled
        </p>
        <p className="mt-2 text-sm font-black text-destiny-grey">
          Starts in{" "}
          {formatCountdown(new Date(draft.startsAt), new Date(now)) ??
            formatTimecode(inMs / 1000)}
        </p>
        <p className="mt-0.5 text-xs text-destiny-grey/55">
          /live goes on air by itself — nobody needs to be at a keyboard.
        </p>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="rounded-2xl border border-black/8 bg-[#f5f7fa] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-destiny-grey/45">
          Finished
        </p>
        <p className="mt-2 text-sm font-black text-destiny-grey">
          This broadcast has run. /live is showing the off-air card.
        </p>
        <p className="mt-0.5 text-xs text-destiny-grey/55">
          Set a new start time to run it again.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/8 bg-[#f5f7fa] p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-destiny-grey/45">
        Off
      </p>
      <p className="mt-2 text-sm font-black text-destiny-grey">
        Nothing simulated is scheduled.
      </p>
      <p className="mt-0.5 text-xs text-destiny-grey/55">
        /live behaves normally: on air when the YouTube channel is streaming, off
        the rest of the week.
      </p>
    </div>
  );
}

/* ── datetime-local ⇄ ISO ────────────────────────────────────────────────── */

/**
 * `datetime-local` has no time zone, so both directions go through the
 * browser's own — which for the people running a Sunday in Stockton is London.
 * The field is labelled as such rather than pretending otherwise.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
