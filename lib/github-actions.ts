/**
 * GitHub Actions API utilities for polling workflow status
 */

export interface WorkflowRun {
  id: number;
  html_url: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  created_at: string;
  started_at: string | null;
  updated_at: string;
  run_number: number;
}

export interface WorkflowStatus {
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  progressPercent: number;
  estimatedSecondsRemaining: number;
  runUrl: string;
  elapsedSeconds: number;
}

const ESTIMATED_DURATION_MS = 180_000; // 3 minutes average for code gen + type check + commit

export async function getWorkflowStatus(
  token: string,
  repo: string,
  runId: number
): Promise<WorkflowStatus> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow status: ${response.status}`);
  }

  const run = (await response.json()) as WorkflowRun;

  const createdAt = new Date(run.created_at).getTime();
  const startedAt = run.started_at ? new Date(run.started_at).getTime() : null;
  const now = Date.now();

  const elapsedMs = startedAt ? now - startedAt : now - createdAt;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  let progressPercent = 0;
  let estimatedSecondsRemaining = 0;

  if (run.status === "queued") {
    progressPercent = 5;
    estimatedSecondsRemaining = Math.floor((ESTIMATED_DURATION_MS + 10_000) / 1000);
  } else if (run.status === "in_progress") {
    progressPercent = Math.min(95, Math.floor((elapsedMs / ESTIMATED_DURATION_MS) * 100));
    estimatedSecondsRemaining = Math.max(
      10,
      Math.floor((ESTIMATED_DURATION_MS - elapsedMs) / 1000)
    );
  } else if (run.status === "completed") {
    progressPercent = 100;
    estimatedSecondsRemaining = 0;
  }

  return {
    status: run.status,
    conclusion: run.conclusion,
    progressPercent,
    estimatedSecondsRemaining,
    runUrl: run.html_url,
    elapsedSeconds,
  };
}
