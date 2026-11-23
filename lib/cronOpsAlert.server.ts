// Ops email for scheduled jobs that are not Destiny One.
//
// Destiny One keeps its own wording in lib/destinyOne/opsAlertEmail.server.ts, but
// every other cron under app/api/cron should call reportCronOpsFailure here when
// something partial or total fails. Recipient: CRON_OPS_ALERT_RECIPIENT, then the
// Destiny One / Smart Search alert addresses, so one inbox gets site-job failures.

import "server-only";
import { sendEmailCard } from "@/lib/emailCard";
import { logCronFailure, type CronFailureDetails } from "@/lib/cronOpsLog";

export type { CronFailureDetails } from "@/lib/cronOpsLog";
export { cronFailurePayload, logCronFailure } from "@/lib/cronOpsLog";

const RECIPIENT =
  process.env.CRON_OPS_ALERT_RECIPIENT ||
  process.env.D1_OPS_ALERT_RECIPIENT ||
  process.env.SMART_SEARCH_ALERT_RECIPIENT ||
  "malachi@squaremediagroup.org";

export async function sendCronOpsAlert(job: string, problem: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`⚠️ RESEND_API_KEY not set — skipping the cron alert for ${job}`);
    return;
  }
  try {
    await sendEmailCard({
      to: RECIPIENT,
      subject: `Site cron: the ${job} job failed`,
      badge: "Scheduled job",
      heading: `The ${job} job failed`,
      intro:
        "A scheduled site job didn't finish cleanly. It will run again on its usual schedule; check Vercel's logs for detail.",
      rows: [
        ["Job", job],
        ["Problem", problem.slice(0, 300)],
        ["When", new Date().toISOString()],
      ],
    });
  } catch (err) {
    console.error(`⚠️ Cron alert email for ${job} failed:`, err);
  }
}

/** Structured log line plus ops email (non–Destiny One jobs). */
export async function reportCronOpsFailure(
  job: string,
  problem: string,
  details?: CronFailureDetails,
): Promise<void> {
  logCronFailure(job, problem, details);
  await sendCronOpsAlert(job, problem);
}