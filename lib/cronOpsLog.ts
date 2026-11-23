// Structured cron failure logging (importable from unit tests).

export type CronFailureDetails = Record<string, string | number | boolean | null | undefined>;

/** One JSON line for Vercel log drains — stable keys, no PII. */
export function cronFailurePayload(
  job: string,
  problem: string,
  details?: CronFailureDetails,
): string {
  return JSON.stringify({
    kind: "cron_failure",
    job,
    problem: problem.slice(0, 500),
    at: new Date().toISOString(),
    ...details,
  });
}

export function logCronFailure(job: string, problem: string, details?: CronFailureDetails): void {
  console.error(`⚠️ Cron job failed ${cronFailurePayload(job, problem, details)}`);
}