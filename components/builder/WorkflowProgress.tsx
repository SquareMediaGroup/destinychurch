"use client";

import { useEffect, useState } from "react";

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

// Sub-steps shown as a typing-style stream while the "Drafting" phase is running.
// These are real things the AI does inside that phase.
const DRAFTING_THOUGHTS = [
  "Reading 60+ existing components from the catalog…",
  "Picking the closest hero template to clone…",
  "Drafting the hero section copy and CTAs…",
  "Composing the supporting sections in order…",
  "Wiring uploaded photos and videos into the layout…",
  "Writing TypeScript and Tailwind classes…",
  "Type-checking against the strict tsconfig…",
];

export default function WorkflowProgress({
  runId,
  runUrl,
  ghToken,
  onComplete,
}: WorkflowProgressProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thoughtIndex, setThoughtIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

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
    interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runId, ghToken, onComplete]);

  // Cycle the "thinking" thought stream every ~3.5s while drafting
  useEffect(() => {
    const isDrafting =
      status?.phases?.[status.currentPhaseIndex]?.name === "Drafting";
    if (!isDrafting) return;
    const t = setInterval(() => {
      setThoughtIndex((i) => (i + 1) % DRAFTING_THOUGHTS.length);
    }, 3500);
    return () => clearInterval(t);
  }, [status]);

  if (!status) {
    return (
      <div className="flex items-center gap-3 text-sm text-destiny-grey/60">
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

  return (
    <div className="space-y-5">
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
          <div className="flex items-center gap-3 text-xs font-bold text-destiny-grey/70">
            <span className="font-mono text-base text-destiny-grey">
              {status.progressPercent}%
            </span>
            <span className="hidden text-destiny-grey/30 sm:inline">·</span>
            <span className="hidden sm:inline">
              elapsed {formatTime(status.elapsedSeconds)}
            </span>
            {!isComplete && status.estimatedSecondsRemaining > 0 && (
              <>
                <span className="hidden text-destiny-grey/30 sm:inline">·</span>
                <span className="text-destiny-grey/70">
                  ~{formatTime(status.estimatedSecondsRemaining)} left
                </span>
              </>
            )}
          </div>
        </div>

        {/* Live thought stream — only while actively drafting */}
        {!isComplete && currentPhase && (
          <p className="mt-2 flex items-start gap-2 text-sm text-destiny-grey/70">
            <span className="material-symbols-rounded mt-0.5 animate-pulse text-base text-indigo-500">
              auto_fix
            </span>
            <span className="flex-1">
              {currentPhase.name === "Drafting"
                ? DRAFTING_THOUGHTS[thoughtIndex]
                : currentPhase.description}
              <span className="ml-0.5 inline-block w-2 animate-pulse text-indigo-500">
                ▍
              </span>
            </span>
          </p>
        )}
      </div>

      {/* Distinct gradient progress bar (NOT destiny-orange — separates from Generate button) */}
      <div className="relative h-3 overflow-hidden rounded-full bg-destiny-grey/10">
        <div
          className={`relative h-full overflow-hidden transition-all duration-500 ease-out ${
            isFailure
              ? "bg-red-500"
              : isSuccess
                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
          }`}
          style={{ width: `${Math.max(status.progressPercent, 5)}%` }}
        >
          {!isComplete && (
            <div className="ai-progress-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          )}
        </div>
      </div>

      {/* Phase checklist */}
      {status.phases.length > 0 && (
        <ol className="space-y-1.5">
          {status.phases.map((p, i) => {
            const active = p.status === "running";
            const done = p.status === "completed";
            const failed = p.status === "failed";
            return (
              <li
                key={`${p.name}-${i}`}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition ${
                  active
                    ? "bg-indigo-50 text-indigo-900"
                    : done
                      ? "text-destiny-grey/50"
                      : failed
                        ? "bg-red-50 text-red-700"
                        : "text-destiny-grey/40"
                }`}
              >
                <PhaseDot
                  status={p.status}
                  isCurrentlyAnimating={active}
                />
                <span
                  className={`text-sm ${active ? "font-bold" : done ? "" : "font-medium"}`}
                >
                  {p.name}
                </span>
                {active && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
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
      <div className="flex items-center justify-between border-t border-black/5 pt-3 text-xs text-destiny-grey/50">
        <span>Workflow run #{runId}</span>
        <a
          href={runUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-destiny-grey/70 hover:text-destiny-orange"
        >
          View on GitHub
          <span className="material-symbols-rounded text-sm">open_in_new</span>
        </a>
      </div>

    </div>
  );
}

function PhaseDot({
  status,
  isCurrentlyAnimating,
}: {
  status: Phase["status"];
  isCurrentlyAnimating: boolean;
}) {
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
  if (status === "running" || isCurrentlyAnimating) {
    return (
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
        <span className="material-symbols-rounded animate-spin text-sm text-indigo-600">
          progress_activity
        </span>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-destiny-grey/20" />
  );
}
