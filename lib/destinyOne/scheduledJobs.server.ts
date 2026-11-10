// Destiny One — the scheduled jobs runner, wired to the database.
//
// `runDueJobs()` claims what is due (d1_claim_due_jobs), runs each job's
// handler and records the outcome (d1_finish_job). The pure half, and the
// rules, are in scheduledJobs.ts.
//
// HANDLERS is where a feature plugs in: Scheduled announcements and Poll
// deadlines each add one entry (kind → function). It is empty until they ship,
// so the every-minute call finds nothing due and returns at once.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { runJobs, type JobHandlers, type RunSummary, type ScheduledJob } from "@/lib/destinyOne/scheduledJobs";

export const HANDLERS: JobHandlers = {};

export async function runDueJobs(handlers: JobHandlers = HANDLERS): Promise<RunSummary> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("d1_claim_due_jobs", { p_limit: 25 });
  if (error) throw new Error(`Claiming scheduled jobs failed: ${error.message}`);
  const jobs = (data ?? []) as ScheduledJob[];
  if (jobs.length === 0) return { claimed: 0, done: 0, retried: 0, failed: 0, unknownKind: 0 };

  return runJobs(jobs, handlers, async (id, jobError) => {
    const { data: outcome, error: finishError } = await supabase.rpc("d1_finish_job", { p_id: id, p_error: jobError });
    if (finishError) throw new Error(`Recording scheduled job ${id} failed: ${finishError.message}`);
    return String(outcome);
  });
}
