/**
 * Email alerts for the Smart Search health check. Sent only on a state change
 * (healthy → down, or down → recovered) so the inbox never gets hourly spam.
 * Uses the same verified Resend sender as the rest of the repo.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const RECIPIENT = process.env.SMART_SEARCH_ALERT_RECIPIENT || "malachi@squaremediagroup.org";
const FROM = process.env.PAGE_AUDIT_FROM || "Destiny AI <noreply@support.squaremediagroup.org>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSmartSearchAlert(
  kind: "down" | "recovered",
  detail: { reason?: string | null; failures?: number },
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not set — skipping Smart Search alert email");
    return;
  }

  const down = kind === "down";
  const accent = down ? "#ef4444" : "#10b981";
  const heading = down ? "Smart Search disabled" : "Smart Search back online";
  const lead = down
    ? "The daily health check failed, so Smart Search has been temporarily disabled on the site and will retry every hour until it recovers."
    : "A retry of the health check succeeded — Smart Search has been re-enabled on the site and is back to the daily check schedule.";

  const html = `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px;color:#222">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <p style="font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${accent};margin:0 0 8px">Smart Search Health</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#363f48">${heading}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444">${lead}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
      <tr><td style="padding:8px 0;color:#888;width:160px">Status</td><td><span style="color:${accent};font-weight:bold">${down ? "DISABLED" : "ENABLED"}</span></td></tr>
      ${detail.reason ? `<tr><td style="padding:8px 0;color:#888">Reason</td><td style="font-family:monospace;font-size:12px">${escapeHtml(detail.reason)}</td></tr>` : ""}
      ${typeof detail.failures === "number" ? `<tr><td style="padding:8px 0;color:#888">Consecutive failures</td><td>${detail.failures}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#888">Checked at</td><td>${new Date().toUTCString()}</td></tr>
    </table>
    <p style="margin-top:24px;font-size:12px;color:#888">Automated alert from the Smart Search health check. ${down ? "You'll get one more email when it recovers." : "No further action needed."}</p>
  </div>
</body></html>`;

  const result = await resend.emails.send({
    from: FROM,
    to: RECIPIENT,
    subject: down ? "[Smart Search] DISABLED — health check failed" : "[Smart Search] Recovered — back online",
    html,
  });

  if (result.error) {
    console.error(
      `Resend rejected the Smart Search alert: ${result.error.name} — ${result.error.message}`,
    );
    return;
  }
  console.log(`📧 Smart Search ${kind} alert sent (id: ${result.data?.id})`);
}
