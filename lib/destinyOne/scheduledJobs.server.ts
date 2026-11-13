// Destiny One — the scheduled jobs runner, wired to the database.
//
// `runDueJobs()` claims what is due (d1_claim_due_jobs), runs each job's
// handler and records the outcome (d1_finish_job). The pure half, and the
// rules, are in scheduledJobs.ts.
//
// HANDLERS is where a feature plugs in (kind → function): send_message and
// close_poll, both in scheduledSends.server.ts.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { runJobs, type JobHandlers, type RunSummary, type ScheduledJob } from "@/lib/destinyOne/scheduledJobs";
import { SCHEDULED_HANDLERS } from "@/lib/destinyOne/scheduledSends.server";

export const HANDLERS: JobHandlers = SCHEDULED_HANDLERS;

export async function runDueJobs(handlers: JobHandlers = HANDLERS): Promise<RunSummary> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("d1_claim_due_jobs", { p_limit: 25 });
  if (error) throw new Error(`Claiming scheduled jobs failed: ${error.message}`);
  const jobs = (data ?? []) as ScheduledJob[];
  if (jobs.length === 0) return { claimed: 0, done: 0, retried: 0, failed: 0, cancelled: 0, unknownKind: 0 };

  return runJobs(
    jobs,
    handlers,
    async (id, jobError) => {
      const { data: outcome, error: finishError } = await supabase.rpc("d1_finish_job", { p_id: id, p_error: jobError });
      if (finishError) throw new Error(`Recording scheduled job ${id} failed: ${finishError.message}`);
      return String(outcome);
    },
    async (id, reason) => {
      const { data: outcome, error: cancelError } = await supabase.rpc("d1_cancel_job", { p_id: id, p_reason: reason });
      if (cancelError) throw new Error(`Cancelling scheduled job ${id} failed: ${cancelError.message}`);
      return String(outcome);
    },
  );
}
