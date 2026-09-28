// Destiny One — email whoever runs the site when a nightly job fails.
//
// The purge (retention) and the sync (the rule re-check) run unattended at
// night. A failure used to show only in Vercel's logs; a failed purge means
// messages outlive the retention period we promise, and a failed re-check
// removes a safety net, so both now send an email. No member data goes in it:
// just the job and the error.
//
// Recipient: D1_OPS_ALERT_RECIPIENT, falling back to the Smart Search alert
// recipient (lib/smartSearchAlertEmail.ts), so one address gets site alerts.

import "server-only";
import { sendEmailCard } from "@/lib/emailCard";

const RECIPIENT =
  process.env.D1_OPS_ALERT_RECIPIENT || process.env.SMART_SEARCH_ALERT_RECIPIENT || "malachi@squaremediagroup.org";

export async function sendOpsAlert(job: string, problem: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`⚠️ RESEND_API_KEY not set — skipping the Destiny One alert for ${job}`);
    return;
  }
  try {
    await sendEmailCard({
      to: RECIPIENT,
      subject: `Destiny One: the ${job} job failed`,
      badge: "Destiny One",
      heading: `The ${job} job failed`,
      intro: "A scheduled Destiny One job didn't finish. It runs again tomorrow night; check Vercel's logs for the details.",
      rows: [
        ["Job", job],
        ["Problem", problem.slice(0, 300)],
        ["When", new Date().toISOString()],
      ],
    });
  } catch (err) {
    console.error(`⚠️ Destiny One alert email for ${job} failed:`, err);
  }
}
