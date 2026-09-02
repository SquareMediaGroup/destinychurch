// The one transactional email card: an orange rule, a badge, a heading, an
// intro, a table of label/value rows, and an optional CTA button.
//
// Extracted from lib/hrEmail.ts, which had already generalised it once from
// app/jobs/actions.ts's application email when four triggers made the
// duplication worth collapsing. The design ticket queue is the fifth, and a
// third copy of 40 lines of inlined table HTML would be the point at which the
// church's emails quietly stop looking like each other.
//
// Verbatim move — the markup, the escaping and the Resend call are unchanged,
// so every existing HR email renders exactly as it did.

import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = "Destiny Church <noreply@support.squaremediagroup.org>";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

export interface EmailCardOptions {
  to: string;
  subject: string;
  badge: string;
  heading: string;
  intro: string;
  rows: [string, string][];
  ctaHref?: string;
  ctaLabel?: string;
}

export function emailCardHtml({ badge, heading, intro, rows, ctaHref, ctaLabel }: EmailCardOptions): string {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <p style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">${esc(label)}</p>
      <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#111827;">${esc(value)}</p>
    `,
    )
    .join("");

  const cta = ctaHref
    ? `<tr>
        <td align="center" style="padding:0 24px 36px 24px;">
          <a href="${ctaHref}"
            style="display:inline-block;padding:14px 36px;border-radius:999px;background:#F58021;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;">
            ${esc(ctaLabel ?? "View")}
          </a>
        </td>
      </tr>`
    : `<tr><td style="height:12px;"></td></tr>`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;">
    <tr>
      <td align="center" style="padding:40px 16px 0 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.08);overflow:hidden;">
          <tr><td style="height:4px;background:#F58021;"></td></tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
              <span style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(245,128,33,0.1);color:#F58021;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                ${esc(badge)}
              </span>
              <h1 style="margin:18px 0 10px 0;font-size:24px;font-weight:800;color:#1a1a1a;">${esc(heading)}</h1>
              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.7;color:#6b7280;">${esc(intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb;border-radius:16px;border:1px solid rgba(0,0,0,0.06);">
                <tr><td style="padding:22px 22px 6px 22px;">${rowsHtml}</td></tr>
              </table>
            </td>
          </tr>
          ${cta}
        </table>
        <p style="margin:24px 0 40px;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
          Destiny Church Tees Valley &bull;
          <a href="https://destinytees.uk" style="color:#9ca3af;text-decoration:underline;">destinytees.uk</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmailCard(opts: EmailCardOptions) {
  await resend.emails.send({
    from: EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: emailCardHtml(opts),
  });
}
