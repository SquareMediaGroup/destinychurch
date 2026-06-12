"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface WorkflowProgressProps {
  runId: number;
  runUrl: string;
  ghToken: string;
  onComplete?: (success: boolean) => void;
}

interface Phase {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  description: string;
}

interface Status {
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  progressPercent: number;
  estimatedSecondsRemaining: number;
  elapsedSeconds: number;
  currentPhaseIndex: number;
  phases: Phase[];
}

const POLL_INTERVAL_MS = 2000;

// Contextual reasoning streams per phase — these make the system feel
// like an actual AI builder instead of a generic CI runner.
const PHASE_THOUGHTS: Record<string, string[]> = {
  Drafting: [
    "Analysing existing Destiny design language…",
    "Reading 60+ components from the catalog…",
    "Picking the closest hero template to clone…",
    "Generating youth-focused hero copy and CTAs…",
    "Matching typography scale to the brand…",
    "Composing supporting sections in order…",
    "Wiring uploaded photos and videos into the layout…",
    "Optimising mobile spacing and rhythm…",
    "Writing TypeScript and Tailwind classes…",
    "Type-checking against the strict tsconfig…",
  ],
  Queued: [
    "Reserving a runner on GitHub Actions…",
    "Allocating compute for the build job…",
    "Warming up the Node and pnpm caches…",
  ],
  "Setting up": [
    "Cloning the destinychurch repository…",
    "Restoring pnpm store from cache…",
    "Installing dependencies…",
    "Booting the AI builder environment…",
  ],
  Building: [
    "Compiling Next.js production bundle…",
    "Tree-shaking unused components…",
    "Generating static page artifacts…",
    "Optimising images and fonts…",
  ],
  Deploying: [
    "Pushing the new page to main…",
    "Triggering Vercel production build…",
    "Invalidating edge caches…",
    "Verifying the live URL responds…",
  ],
};

const DEFAULT_THOUGHTS = [
  "Working through this phase…",
  "Coordinating with the build runner…",
  "Almost there…",
];

const LIVE_LABELS = ["Live", "Streaming", "Realtime", "Thinking"];

export default function WorkflowProgress({
  runId,
  runUrl,
  ghToken,
  onComplete,
}: WorkflowProgressProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [liveLabelIndex, setLiveLabelIndex] = useState(0);
  // Rolling log of the last few thoughts so the active panel feels alive.
  const streamRef = useRef<{ id: number; text: string }[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/admin/builder/ai/workflow-status?runId=${runId}`,
          {
            headers: {
              Authorization: `Bearer ${ghToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.status}`);
        }

        const data = (await response.json()) as { status: Status };
        setStatus(data.status);
        setError(null);

        if (data.status.status === "completed") {
          clearInterval(interval);
          onComplete?.(data.status.conclusion === "success");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
      }
    };

    poll();
    // poll() only touches `interval` after its first await, by which point
    // the const below is initialised.
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runId, ghToken, onComplete]);

  const currentPhaseName =
    status && status.currentPhaseIndex >= 0
      ? status.phases[status.currentPhaseIndex]?.name
      : undefined;

  const thoughts = useMemo(() => {
    if (!currentPhaseName) return DEFAULT_THOUGHTS;
    return PHASE_THOUGHTS[currentPhaseName] ?? DEFAULT_THOUGHTS;
  }, [currentPhaseName]);

  // Cycle thoughts; on each tick push the new line into the rolling stream
  // and keep only the most recent 3 so we get a "log" feel.
  useEffect(() => {
    if (!status || status.status === "completed") return;
    setThoughtIndex(0);
    streamRef.current = [];

    let i = 0;
    let counter = 0;
    const push = () => {
      const text = thoughts[i % thoughts.length];
      streamRef.current = [
        ...streamRef.current.slice(-2),
        { id: ++counter, text },
      ];
      setThoughtIndex(i % thoughts.length);
      forceRender((x) => x + 1);
      i += 1;
    };
    push();
    const t = setInterval(push, 2600);
    return () => clearInterval(t);
  }, [thoughts, status?.status, currentPhaseName]);

  // Cycle the LIVE pill label
  useEffect(() => {
    if (!status || status.status === "completed") return;
    const t = setInterval(() => {
      setLiveLabelIndex((i) => (i + 1) % LIVE_LABELS.length);
    }, 2400);
    return () => clearInterval(t);
  }, [status?.status]);

  if (!status) {
    return (
      <div className="flex items-center gap-3 text-sm text-destiny-grey/80">
        <span className="material-symbols-rounded animate-spin text-lg">
          progress_activity
        </span>
        Connecting to workflow…
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const isComplete = status.status === "completed";
  const isSuccess = status.conclusion === "success";
  const isFailure = isComplete && !isSuccess;

  const currentPhase =
    status.currentPhaseIndex >= 0 ? status.phases[status.currentPhaseIndex] : null;

  const stream = streamRef.current;

  return (
    <div className="space-y-4">
      {/* Top row: phase title + percent + elapsed */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-center gap-3">
            {!isComplete && (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
              </span>
            )}
            <h3 className="text-lg font-black text-destiny-grey md:text-xl">
              {isComplete
                ? isSuccess
                  ? "Done — page committed to main"
                  : "Generation failed"
                : currentPhase
                  ? currentPhase.name
                  : "Starting up…"}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-destiny-grey/80">
            <span className="font-mono text-base text-destiny-grey">
              {status.progressPercent}%
            </span>
            <span className="hidden text-destiny-grey/40 sm:inline">·</span>
            <span className="hidden sm:inline">
              elapsed {formatTime(status.elapsedSeconds)}
            </span>
            {!isComplete && status.estimatedSecondsRemaining > 0 && (
              <>
                <span className="hidden text-destiny-grey/40 sm:inline">·</span>
                <span className="text-destiny-grey/80">
                  ~{formatTime(status.estimatedSecondsRemaining)} left
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Distinct gradient progress bar with flowing gradient + shimmer */}
      <div className="relative h-3 overflow-hidden rounded-full bg-destiny-grey/10">
        <div
          className={`relative h-full overflow-hidden ${
            isFailure
              ? "bg-red-500"
              : isSuccess
                ? "ai-progress-fill bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-500"
                : "ai-progress-fill bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
          }`}
          style={{ width: `${Math.max(status.progressPercent, 5)}%` }}
        >
          {!isComplete && (
            <div className="ai-progress-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          )}
        </div>
      </div>

      {/* Active step focus panel — replaces the empty middle space with
          contextual reasoning that streams in like a log. */}
      {!isComplete && currentPhase && (
        <div className="relative overflow-hidden rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 p-4">
          <div className="flex items-start gap-3">
            <span className="relative mt-1 flex h-2.5 w-2.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-500" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-violet-600">
                <span className="material-symbols-rounded text-sm">
                  auto_fix
                </span>
                Reasoning
              </div>
              <div className="mt-1.5 space-y-1 font-mono text-[13px] leading-relaxed text-destiny-grey/85">
                {stream.length === 0 ? (
                  <div className="text-destiny-grey/60">
                    {thoughts[thoughtIndex]}
                  </div>
                ) : (
                  stream.map((line, idx) => {
                    const isLast = idx === stream.length - 1;
                    return (
                      <div
                        key={line.id}
                        className={`ai-stream-in flex items-start gap-2 ${
                          isLast
                            ? "text-destiny-grey"
                            : idx === stream.length - 2
                              ? "text-destiny-grey/60"
                              : "text-destiny-grey/35"
                        }`}
                      >
                        <span
                          className={`mt-1 inline-block flex-shrink-0 ${
                            isLast ? "text-violet-500" : "text-destiny-grey/40"
                          }`}
                        >
                          ›
                        </span>
                        <span className="flex-1">
                          {line.text}
                          {isLast && (
                            <span className="ml-0.5 inline-block w-2 animate-pulse text-violet-500">
                              ▍
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase checklist */}
      {status.phases.length > 0 && (
        <ol className="space-y-1">
          {status.phases.map((p, i) => {
            const active = p.status === "running";
            const done = p.status === "completed";
            const failed = p.status === "failed";
            return (
              <li
                key={`${p.name}-${i}`}
                className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 transition ${
                  active
                    ? "ai-active-row border border-indigo-200 bg-gradient-to-r from-indigo-100/90 via-indigo-50/70 to-transparent text-indigo-900 shadow-sm shadow-indigo-500/10"
                    : done
                      ? "text-destiny-grey/70"
                      : failed
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "text-destiny-grey/55"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                )}
                <PhaseDot status={p.status} />
                <span
                  className={`text-sm ${
                    active
                      ? "text-[15px] font-black"
                      : done
                        ? "font-medium"
                        : "font-medium"
                  }`}
                >
                  {p.name}
                </span>
                {active && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    </span>
                    In progress
                  </span>
                )}
                {done && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                    Done
                  </span>
                )}
                {failed && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">
                    Failed
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Polling error (transient) */}
      {error && (
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Polling status failed: {error}. Retrying…
        </div>
      )}

      {/* Footer link to GitHub */}
      <div className="flex items-center justify-between border-t border-black/5 pt-3 text-xs text-destiny-grey/70">
        <span>Workflow run #{runId}</span>
        <a
          href={runUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-destiny-grey hover:text-destiny-orange"
        >
          View on GitHub
          <span className="material-symbols-rounded text-sm">open_in_new</span>
        </a>
      </div>
    </div>
  );
}

export function useCycledLiveLabel(active: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setI((x) => (x + 1) % LIVE_LABELS.length), 2400);
    return () => clearInterval(t);
  }, [active]);
  return LIVE_LABELS[i];
}

function PhaseDot({ status }: { status: Phase["status"] }) {
  if (status === "completed") {
    return (
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <span className="material-symbols-rounded text-sm">check</span>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
        <span className="material-symbols-rounded text-sm">close</span>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/40">
        <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-60" />
        <span className="material-symbols-rounded relative animate-spin text-sm">
          progress_activity
        </span>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-destiny-grey/25" />
  );
}
