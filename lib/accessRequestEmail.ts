/**
 * Email sent to the tech team when a signed-in user requests access to a
 * backend system they don't yet have a role for (from the sign-in chooser's
 * locked card). Uses the same verified Resend sender as the rest of the repo.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAccessRequestEmailHtml({
  requesterEmail,
  systemLabel,
  requestedAt,
}: {
  requesterEmail: string;
  systemLabel: string;
  requestedAt: Date;
}): string {
  const accent = "#f97316";
  const email = escapeHtml(requesterEmail);
  const system = escapeHtml(systemLabel);

  return `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px;color:#222">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <p style="font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${accent};margin:0 0 8px">Backend Access Request</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#363f48">${email} wants access to ${system}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444">A signed-in user clicked the locked <strong>${system}</strong> card on the staff sign-in screen and requested access.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
      <tr><td style="padding:8px 0;color:#888;width:160px">Requested by</td><td style="font-weight:bold">${email}</td></tr>
      <tr><td style="padding:8px 0;color:#888">System</td><td>${system}</td></tr>
      <tr><td style="padding:8px 0;color:#888">Requested at</td><td>${requestedAt.toUTCString()}</td></tr>
    </table>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#444">To grant access, open <strong>Administration → HR → Staff</strong>, edit that person's record, and tick <strong>${system}</strong> under backend access.</p>
    <p style="margin-top:24px;font-size:12px;color:#888">Automated message from the Destiny Church staff portal.</p>
  </div>
</body></html>`;
}
