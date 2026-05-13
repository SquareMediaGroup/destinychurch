/**
 * Send an audit email after a page is auto-generated and committed.
 * Uses the same Resend client pattern as other server actions in the repo.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const AUDIT_RECIPIENT = process.env.PAGE_AUDIT_RECIPIENT || "malachi@squaremediagroup.org";
// Send from the verified support.squaremediagroup.org domain so audit emails
// don't land in spam (same domain used by contact/hire actions).
const FROM = process.env.PAGE_AUDIT_FROM || "Destiny AI <noreply@support.squaremediagroup.org>";

export interface PageAuditEmailInput {
  title: string;
  slug: string;
  requester: string; // email of authenticated user
  reasoning: string;
  files: string[];
  commitHash?: string;
  validation: {
    ok: boolean;
    output: string;
    durationMs: number;
  };
  pushed: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPageAuditEmail(input: PageAuditEmailInput): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping audit email");
    return;
  }

  const status = input.validation.ok ? "PASSED" : "FAILED";
  const statusColor = input.validation.ok ? "#10b981" : "#ef4444";

  const filesHtml = input.files
    .map((f) => `<li style="font-family:monospace;font-size:12px">${escapeHtml(f)}</li>`)
    .join("");

  const html = `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px;color:#222">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <p style="font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#f58021;margin:0 0 8px">AI Page Generation</p>
    <h1 style="margin:0 0 24px;font-size:24px;color:#363f48">${escapeHtml(input.title)}</h1>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
      <tr><td style="padding:8px 0;color:#888;width:140px">Route</td><td style="font-family:monospace">/${escapeHtml(input.slug)}</td></tr>
      <tr><td style="padding:8px 0;color:#888">Requested by</td><td>${escapeHtml(input.requester)}</td></tr>
      <tr><td style="padding:8px 0;color:#888">Validation</td><td><span style="color:${statusColor};font-weight:bold">${status}</span> (${input.validation.durationMs}ms)</td></tr>
      ${input.commitHash ? `<tr><td style="padding:8px 0;color:#888">Commit</td><td style="font-family:monospace">${escapeHtml(input.commitHash.slice(0, 12))}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#888">Pushed to main</td><td>${input.pushed ? "Yes" : "No"}</td></tr>
    </table>

    <h2 style="font-size:14px;color:#363f48;margin:24px 0 8px">AI reasoning</h2>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444">${escapeHtml(input.reasoning) || "<em>none</em>"}</p>

    <h2 style="font-size:14px;color:#363f48;margin:24px 0 8px">Files</h2>
    <ul style="margin:0 0 20px;padding-left:20px">${filesHtml}</ul>

    ${
      !input.validation.ok
        ? `<h2 style="font-size:14px;color:#ef4444;margin:24px 0 8px">Validation output</h2>
           <pre style="background:#1a1a1a;color:#f5f5f5;padding:12px;border-radius:6px;font-size:11px;overflow:auto;max-height:240px">${escapeHtml(input.validation.output.slice(0, 4000))}</pre>`
        : ""
    }

    <p style="margin-top:32px;font-size:12px;color:#888">This page was generated and committed automatically without human review. Reply to this email to flag concerns.</p>
  </div>
</body></html>`;

  console.log(`📧 Sending audit email from "${FROM}" to "${AUDIT_RECIPIENT}"`);

  const result = await resend.emails.send({
    from: FROM,
    to: AUDIT_RECIPIENT,
    subject: `[AI page] ${input.title} — ${status}${input.pushed ? " · pushed" : ""}`,
    html,
  });

  if (result.error) {
    throw new Error(
      `Resend rejected the email: ${result.error.name} — ${result.error.message}. ` +
        `From="${FROM}" To="${AUDIT_RECIPIENT}". ` +
        `If using a custom domain, verify it at https://resend.com/domains.`
    );
  }

  console.log(`✓ Audit email sent (id: ${result.data?.id})`);
}
