import { test, expect } from "@playwright/test";
import { JobCancelled, describeError, runJobs, type JobHandlers, type ScheduledJob } from "../../lib/destinyOne/scheduledJobs";

/**
 * The scheduled jobs runner decides what to do with a claimed batch: run each
 * job's handler, record how it ended, and never let one failure stop the rest.
 * The claim itself (each job handed out once) is SQL: d1_claim_due_jobs.
 */

const job = (id: number, kind = "test", attempts = 1): ScheduledJob => ({
  id,
  kind,
  run_at: "2026-11-10T09:00:00Z",
  group_id: null,
  created_by: null,
  payload: {},
  attempts,
});

/** A stand-in for d1_finish_job: success is done; a failure retries until the 3rd attempt. */
function finisher(jobs: ScheduledJob[]) {
  const calls: { id: number; error: string | null }[] = [];
  const finish = async (id: number, error: string | null) => {
    calls.push({ id, error });
    if (error === null) return "done";
    return (jobs.find((j) => j.id === id)?.attempts ?? 1) >= 3 ? "failed" : "pending";
  };
  return { calls, finish };
}

test.describe("scheduled jobs runner", () => {
  test("runs each job through its handler, in order, and marks it done", async () => {
    const jobs = [job(1), job(2), job(3)];
    const ran: number[] = [];
    const handlers: JobHandlers = { test: async (j) => void ran.push(j.id) };
    const { calls, finish } = finisher(jobs);
    const summary = await runJobs(jobs, handlers, finish);
    expect(ran).toEqual([1, 2, 3]);
    expect(calls.map((c) => c.error)).toEqual([null, null, null]);
    expect(summary).toEqual({ claimed: 3, done: 3, retried: 0, failed: 0, cancelled: 0, unknownKind: 0 });
  });

  test("a job that throws is recorded with its error and the rest still run", async () => {
    const jobs = [job(1), job(2)];
    const handlers: JobHandlers = {
      test: async (j) => {
        if (j.id === 1) throw new Error("group\nis   paused");
      },
    };
    const { calls, finish } = finisher(jobs);
    const summary = await runJobs(jobs, handlers, finish);
    expect(calls).toEqual([
      { id: 1, error: "group is paused" },
      { id: 2, error: null },
    ]);
    expect(summary).toMatchObject({ done: 1, retried: 1, failed: 0 });
  });

  test("a job on its last attempt is counted as failed", async () => {
    const jobs = [job(1, "test", 3)];
    const { finish } = finisher(jobs);
    const summary = await runJobs(jobs, { test: async () => Promise.reject(new Error("nope")) }, finish);
    expect(summary).toMatchObject({ done: 0, retried: 0, failed: 1 });
  });

  test("a kind with no handler is reported, not run, and does not stop the others", async () => {
    const jobs = [job(1, "mystery"), job(2)];
    const ran: number[] = [];
    const { calls, finish } = finisher(jobs);
    const summary = await runJobs(jobs, { test: async (j) => void ran.push(j.id) }, finish);
    expect(ran).toEqual([2]);
    expect(calls[0].error).toContain('"mystery"');
    expect(summary).toMatchObject({ claimed: 2, done: 1, retried: 1, unknownKind: 1 });
  });

  test("kinds like constructor or toString are not mistaken for handlers", async () => {
    const jobs = [job(1, "constructor"), job(2, "toString")];
    const { finish } = finisher(jobs);
    const summary = await runJobs(jobs, {}, finish);
    expect(summary.unknownKind).toBe(2);
  });

  test("a handler that cancels is not retried: the job is cancelled with its reason", async () => {
    const jobs = [job(1), job(2)];
    const cancelled: { id: number; reason: string }[] = [];
    const { calls, finish } = finisher(jobs);
    const summary = await runJobs(
      jobs,
      {
        test: async (j) => {
          if (j.id === 1) throw new JobCancelled("The group is paused.");
        },
      },
      finish,
      async (id, reason) => {
        cancelled.push({ id, reason });
        return "cancelled";
      },
    );
    expect(cancelled).toEqual([{ id: 1, reason: "The group is paused." }]);
    expect(calls).toEqual([{ id: 2, error: null }]);
    expect(summary).toMatchObject({ claimed: 2, done: 1, retried: 0, failed: 0, cancelled: 1 });
  });

  test("failing to record an outcome does not stop the batch", async () => {
    const jobs = [job(1), job(2)];
    const ran: number[] = [];
    const summary = await runJobs(jobs, { test: async (j) => void ran.push(j.id) }, async () => {
      throw new Error("database down");
    });
    expect(ran).toEqual([1, 2]);
    expect(summary).toMatchObject({ claimed: 2, done: 0 });
  });

  test("an empty batch does nothing", async () => {
    const summary = await runJobs([], {}, async () => "done");
    expect(summary).toEqual({ claimed: 0, done: 0, retried: 0, failed: 0, cancelled: 0, unknownKind: 0 });
  });

  test("error text is flattened and kept short", () => {
    expect(describeError(new Error("a\n\nb"))).toBe("a b");
    expect(describeError("x".repeat(500))).toHaveLength(200);
  });
});
