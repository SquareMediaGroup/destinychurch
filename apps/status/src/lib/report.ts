// "Report a problem" emails to the super admins. Sent straight to Resend's
// HTTP API, not through the website or Supabase, so a report still arrives
// while those are the thing that's down.
//
// Recipients are STATUS_REPORT_RECIPIENTS (comma-separated). It is a fixed
// list rather than a lookup of super_admin roles, because that lookup needs
// Supabase. Keep it in step with who holds super_admin.

const RESEND_URL = "https://api.resend.com/emails";
const FROM = process.env.STATUS_REPORT_FROM || "Destiny Status <noreply@support.squaremediagroup.org>";

export function reportRecipients(): string[] {
  return (process.env.STATUS_REPORT_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface Report {
  service: string;
  component: string;
  shownAs: string;
  message: string;
  email: string | null;
  userAgent: string | null;
}

export async function sendReport(report: Report): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = reportRecipients();
  if (!key || to.length === 0) {
    console.warn("⚠️ RESEND_API_KEY or STATUS_REPORT_RECIPIENTS not set — report not sent");
    return false;
  }

  const rows: [string, string][] = [
    ["Service", report.service],
    ["Part", report.component],
    ["Status page showed", report.shownAs],
    ["Reported at", new Date().toUTCString()],
    ["Reply to", report.email ?? "Not given"],
    ["Device", report.userAgent ?? "Unknown"],
  ];

  const html = `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px;color:#222">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <p style="font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#f58021;margin:0 0 8px">Status page report</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#363f48">Someone reported a problem with ${escapeHtml(report.component)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;white-space:pre-wrap">${report.message ? escapeHtml(report.message) : "<em>No details given.</em>"}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#888;width:170px">${k}</td><td>${escapeHtml(v)}</td></tr>`).join("")}
    </table>
    <p style="margin-top:24px;font-size:12px;color:#888">Sent from status.destinytees.uk to super admins.</p>
  </div>
</body></html>`;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `Status report: ${report.service} / ${report.component}`,
        html,
        ...(report.email ? { reply_to: report.email } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`❌ Resend rejected the status report (${res.status})`);
    return res.ok;
  } catch (err) {
    console.error("❌ Couldn't reach Resend for the status report", err);
    return false;
  }
}
