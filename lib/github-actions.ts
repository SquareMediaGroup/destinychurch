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

interface WorkflowStep {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "skipped" | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

interface WorkflowJob {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  steps?: WorkflowStep[];
}

export interface WorkflowPhase {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  // For UI: a short, human-readable description of what's happening in this phase
  description: string;
}

export interface WorkflowStatus {
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  progressPercent: number;
  estimatedSecondsRemaining: number;
  runUrl: string;
  elapsedSeconds: number;
  /** Index of the currently running phase in `phases`. -1 = none active. */
  currentPhaseIndex: number;
  phases: WorkflowPhase[];
}

const ESTIMATED_DURATION_MS = 180_000; // 3 minutes average for code gen + type check + commit

// Map raw GitHub Actions step names to friendly volunteer-facing copy.
// The keys are lower-cased substrings — first match wins.
const STEP_DESCRIPTIONS: Array<{ match: string; name: string; description: string }> = [
  { match: "set up job", name: "Booting", description: "Spinning up the build environment" },
  { match: "checkout", name: "Checkout", description: "Pulling the latest code from main" },
  { match: "setup node", name: "Setup", description: "Installing Node.js" },
  { match: "npm ci", name: "Dependencies", description: "Installing project dependencies" },
  { match: "configure git", name: "Configure", description: "Configuring git for the bot" },
  { match: "generate page code", name: "Drafting", description: "AI is reading the components and drafting your page" },
  { match: "post ", name: "Cleanup", description: "Cleaning up temporary files" },
  { match: "complete job", name: "Finishing", description: "Wrapping up" },
];

export function describeStep(rawName: string): { name: string; description: string } {
  const lower = rawName.toLowerCase();
  for (const entry of STEP_DESCRIPTIONS) {
    if (lower.includes(entry.match)) {
      return { name: entry.name, description: entry.description };
    }
  }
  return { name: rawName, description: rawName };
}

export function buildPhases(steps: WorkflowStep[] | undefined): {
  phases: WorkflowPhase[];
  currentIndex: number;
} {
  if (!steps || steps.length === 0) {
    // No step data yet — return generic queued phase
    return {
      phases: [
        {
          name: "Queued",
          status: "running",
          description: "Waiting for the build runner to start…",
        },
      ],
      currentIndex: 0,
    };
  }

  // Filter out internal "Set up runner" / "Complete job" wrappers we don't want to surface
  const visible = steps.filter((s) => {
    const lower = s.name.toLowerCase();
    return !lower.includes("set up runner") && !lower.includes("post job cleanup");
  });

  let currentIndex = -1;
  const phases: WorkflowPhase[] = visible.map((s, i) => {
    const { name, description } = describeStep(s.name);
    let phaseStatus: WorkflowPhase["status"] = "pending";
    if (s.status === "in_progress") {
      phaseStatus = "running";
      currentIndex = i;
    } else if (s.status === "completed") {
      phaseStatus = s.conclusion === "failure" ? "failed" : "completed";
    }
    return { name, description, status: phaseStatus };
  });

  // If everything is "completed" but no step was "in_progress" at fetch time,
  // mark the last completed step as the current one for display purposes.
  if (currentIndex === -1) {
    for (let i = phases.length - 1; i >= 0; i--) {
      if (phases[i].status === "completed" || phases[i].status === "failed") {
        currentIndex = i;
        break;
      }
    }
  }

  return { phases, currentIndex };
}

async function fetchJobs(
  token: string,
  repo: string,
  runId: number
): Promise<WorkflowJob[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${token}`,
      },
    }
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { jobs?: WorkflowJob[] };
  return data.jobs ?? [];
}

export async function getWorkflowStatus(
  token: string,
  repo: string,
  runId: number
): Promise<WorkflowStatus> {
  const [response, jobs] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${token}`,
      },
    }),
    fetchJobs(token, repo, runId).catch(() => [] as WorkflowJob[]),
  ]);

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

  // Pull steps from the first/only job in the run
  const job = jobs[0];
  const { phases, currentIndex } = buildPhases(job?.steps);

  return {
    status: run.status,
    conclusion: run.conclusion,
    progressPercent,
    estimatedSecondsRemaining,
    runUrl: run.html_url,
    elapsedSeconds,
    currentPhaseIndex: currentIndex,
    phases,
  };
}
