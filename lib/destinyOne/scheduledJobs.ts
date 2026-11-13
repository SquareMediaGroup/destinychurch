// Destiny One — the scheduled jobs runner (the pure half).
//
// d1_scheduled_jobs (supabase/migrations/20261110_01_destiny_one_scheduled_jobs.sql)
// holds things that happen at a set time. Each row has a `kind`; the handler
// registered for that kind does the work. This file only decides what to do with
// a claimed batch, with the claim and the finish passed in, so it is tested
// without a database (tests/unit/destiny-one-scheduled-jobs.spec.ts).
// The route (app/api/cron/destiny-one-scheduled-jobs) wires in the real ones.
//
// A job can be handed out again if a run died mid-way, so a handler has to be
// safe to repeat: use `job.id` as its idempotency key.

export interface ScheduledJob {
  id: number;
  kind: string;
  run_at: string;
  group_id: string | null;
  created_by: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}

/** Does the work for one kind of job. Throw to have it retried. */
export type JobHandler = (job: ScheduledJob) => Promise<void>;

export type JobHandlers = Record<string, JobHandler>;

/**
 * Thrown by a handler when a job can never succeed and must not be retried: the
 * group was paused, the leader left. The job is cancelled with `reason`. The
 * handler tells whoever needs to know before it throws.
 */
export class JobCancelled extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "JobCancelled";
  }
}

export interface RunSummary {
  claimed: number;
  done: number;
  retried: number;
  failed: number;
  /** Jobs a handler gave up on for good (JobCancelled). */
  cancelled: number;
  /** Jobs whose kind has no handler (retried like any other failure, then failed). */
  unknownKind: number;
}

/** What went wrong, kept short and free of message text: it is stored in the table and emailed. */
export function describeError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/\s+/g, " ").slice(0, 200);
}

/**
 * Runs a claimed batch one job at a time, in due order, and records how each
 * ended through `finish`. One job failing never stops the rest.
 * `finish` returns the job's new status ('done', 'pending' to retry, or 'failed').
 */
export async function runJobs(
  jobs: ScheduledJob[],
  handlers: JobHandlers,
  finish: (id: number, error: string | null) => Promise<string>,
  cancel: (id: number, reason: string) => Promise<string> = async () => "cancelled",
): Promise<RunSummary> {
  const summary: RunSummary = { claimed: jobs.length, done: 0, retried: 0, failed: 0, cancelled: 0, unknownKind: 0 };
  for (const job of jobs) {
    const handler = Object.hasOwn(handlers, job.kind) ? handlers[job.kind] : undefined;
    let error: string | null = null;
    let cancelReason: string | null = null;
    if (!handler) {
      summary.unknownKind += 1;
      error = `No handler for job kind "${job.kind}".`;
    } else {
      try {
        await handler(job);
      } catch (e) {
        if (e instanceof JobCancelled) cancelReason = describeError(e);
        else error = describeError(e);
      }
    }
    if (cancelReason !== null) {
      const outcome = await cancel(job.id, cancelReason).catch(() => "unrecorded");
      if (outcome === "cancelled") summary.cancelled += 1;
      continue;
    }
    // An unknown kind goes through the same retries, which also covers a deploy that
    // is part-way through adding its handler.
    const outcome = await finish(job.id, error).catch(() => "unrecorded");
    if (outcome === "done") summary.done += 1;
    else if (outcome === "pending") summary.retried += 1;
    else if (outcome === "failed") summary.failed += 1;
  }
  return summary;
}
