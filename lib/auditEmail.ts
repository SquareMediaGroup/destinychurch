// The weekly audit report email.
//
// Same visual language as lib/hrEmail.ts — orange rule, rounded white card,
// centred badge — but a different shape inside: HR's emails are a handful of
// labelled rows, this one is a written report with a stat strip above it. The
// two are deliberately not forced into one template; the shared thing is the
// brand, not the layout.
//
// Sent by app/api/cron/audit-weekly-report to every Super Admin, since they are
// exactly the people who can open /admin/audit and act on it.

import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Destiny Church <noreply@support.squaremediagroup.org>";

const ORANGE = "#F58021";
const FONT =
  "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The small slice of markdown the report actually uses: paragraphs, `- ` lists,
 * `## ` subheadings and `**bold**`.
 *
 * Written by hand rather than pulled in from a library because this runs inside
 * an email, where the output has to be inline-styled table-safe HTML — a
 * general-purpose renderer would emit `<h2>`/`<ul>` with default margins that
 * Outlook and Gmail each interpret differently.
 *
 * Everything is escaped before any tag is added, so nothing the model writes can
 * inject markup.
 */
function renderReportBody(markdown: string): string {
  const blocks: string[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">${list
        .map(
          (item) =>
            `<tr>
              <td width="16" valign="top" style="padding:0 0 8px 0;color:${ORANGE};font-size:14px;line-height:1.7;">&bull;</td>
              <td style="padding:0 0 8px 0;font-family:${FONT};font-size:14px;line-height:1.7;color:#374151;">${item}</td>
            </tr>`,
        )
        .join("")}</table>`,
    );
    list = [];
  };

  const inline = (text: string) =>
    esc(text).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#111827;">$1</strong>');

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      list.push(inline(line.slice(2)));
      continue;
    }
    flushList();
    if (line.startsWith("#")) {
      const text = line.replace(/^#+\s*/, "");
      blocks.push(
        `<p style="margin:22px 0 8px 0;font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;color:#9ca3af;">${inline(text)}</p>`,
      );
      continue;
    }
    blocks.push(
      `<p style="margin:0 0 14px 0;font-family:${FONT};font-size:14px;line-height:1.75;color:#374151;">${inline(line)}</p>`,
    );
  }

  flushList();
  return blocks.join("");
}

export interface AuditReportStat {
  label: string;
  value: string;
}

export interface AuditReportEmail {
  to: string[];
  periodLabel: string;
  headline: string;
  body: string;
  stats: AuditReportStat[];
  /** "sarah@… — 24 changes" lines under the stat strip. */
  people: string[];
}

function statStrip(stats: AuditReportStat[]): string {
  if (stats.length === 0) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;background:#f9fafb;border-radius:16px;border:1px solid rgba(0,0,0,0.06);">
    <tr>
      ${stats
        .map(
          (stat) => `<td align="center" style="padding:18px 8px;font-family:${FONT};">
            <p style="margin:0;font-size:26px;font-weight:800;color:#111827;line-height:1.1;">${esc(stat.value)}</p>
            <p style="margin:4px 0 0 0;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">${esc(stat.label)}</p>
          </td>`,
        )
        .join("")}
    </tr>
  </table>`;
}

function peopleList(people: string[]): string {
  if (people.length === 0) return "";
  return `<p style="margin:22px 0 8px 0;font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;color:#9ca3af;">Who was active</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${people
      .map(
        (line) =>
          `<tr><td style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05);font-family:${FONT};font-size:13px;color:#374151;">${esc(line)}</td></tr>`,
      )
      .join("")}
  </table>`;
}

function reportHtml(report: AuditReportEmail): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${esc(report.headline)}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;">
    <tr>
      <td align="center" style="padding:40px 16px 0 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:600px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.08);overflow:hidden;">
          <tr><td style="height:4px;background:${ORANGE};"></td></tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;font-family:${FONT};text-align:center;">
              <span style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(245,128,33,0.1);color:${ORANGE};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Admin activity
              </span>
              <h1 style="margin:18px 0 8px 0;font-size:23px;font-weight:800;color:#1a1a1a;line-height:1.3;">${esc(report.headline)}</h1>
              <p style="margin:0 0 26px 0;font-size:13px;color:#9ca3af;">${esc(report.periodLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              ${statStrip(report.stats)}
              ${renderReportBody(report.body)}
              ${peopleList(report.people)}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 24px 36px 24px;">
              <a href="https://destinytees.uk/admin/audit"
                style="display:inline-block;padding:14px 36px;border-radius:999px;background:${ORANGE};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:700;text-decoration:none;">
                Open the audit log
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 40px;font-size:12px;color:#9ca3af;font-family:${FONT};">
          Destiny Church Tees Valley &bull;
          <a href="https://destinytees.uk" style="color:#9ca3af;text-decoration:underline;">destinytees.uk</a><br />
          You get this because you are a Super Admin.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative — some clients show it, and it is the searchable copy. */
function reportText(report: AuditReportEmail): string {
  return [
    report.headline,
    report.periodLabel,
    "",
    report.stats.map((s) => `${s.value} ${s.label}`).join("  |  "),
    "",
    report.body,
    "",
    report.people.length ? `Who was active:\n${report.people.join("\n")}` : "",
    "",
    "Open the audit log: https://destinytees.uk/admin/audit",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendAuditReportEmail(report: AuditReportEmail): Promise<void> {
  if (report.to.length === 0) return;

  await resend.emails.send({
    from: FROM,
    to: report.to,
    subject: `Admin activity — ${report.periodLabel}`,
    html: reportHtml(report),
    text: reportText(report),
  });
}
