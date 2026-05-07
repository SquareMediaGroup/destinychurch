"use client";

import { useEffect, useState } from "react";

interface WorkflowProgressProps {
  runId: number;
  runUrl: string;
  ghToken: string;
  onComplete?: (success: boolean) => void;
}

interface Status {
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  progressPercent: number;
  estimatedSecondsRemaining: number;
  elapsedSeconds: number;
}

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

export default function WorkflowProgress({
  runId,
  runUrl,
  ghToken,
  onComplete,
}: WorkflowProgressProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const data = (await response.json()) as {
          status: Status;
        };
        setStatus(data.status);
        setLoading(false);
        setError(null);

        if (data.status.status === "completed") {
          clearInterval(interval);
          onComplete?.(data.status.conclusion === "success");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
        setLoading(false);
      }
    };

    poll();
    interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [runId, ghToken, onComplete]);

  if (!status) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusLabel = () => {
    switch (status.status) {
      case "queued":
        return "Queued...";
      case "in_progress":
        return "Generating page...";
      case "completed":
        return status.conclusion === "success" ? "Complete" : "Failed";
      default:
        return status.status;
    }
  };

  const isComplete = status.status === "completed";
  const isSuccess = status.conclusion === "success";

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-destiny-grey">
            {getStatusLabel()}
          </span>
          <span className="text-sm text-destiny-grey/60">
            {status.progressPercent}%
            {!isComplete && status.estimatedSecondsRemaining > 0 && (
              <span className="ml-2">
                (about {formatTime(status.estimatedSecondsRemaining)} left)
              </span>
            )}
          </span>
        </div>

        {/* Bar */}
        <div className="h-2 bg-destiny-grey/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isSuccess
                ? "bg-green-500"
                : status.conclusion === "failure"
                  ? "bg-red-500"
                  : "bg-destiny-orange"
            }`}
            style={{ width: `${status.progressPercent}%` }}
          />
        </div>

        {/* Time info */}
        <div className="text-xs text-destiny-grey/60">
          Elapsed: {formatTime(status.elapsedSeconds)}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success state with CTA */}
      {isComplete && isSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-green-700">
            Page generated and committed to main
          </p>
          <a
            href={runUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-destiny-orange text-white text-sm font-semibold rounded-lg hover:brightness-110 transition"
          >
            View Workflow Run
          </a>
        </div>
      )}

      {/* Failure state */}
      {isComplete && !isSuccess && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700">
            Page generation failed
          </p>
          <a
            href={runUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:brightness-110 transition"
          >
            View Logs
          </a>
        </div>
      )}
    </div>
  );
}
