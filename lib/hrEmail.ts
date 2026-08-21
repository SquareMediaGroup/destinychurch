// HR notification emails — leave requests, decisions, and the review-reminder
// digest. Shares the badge/heading/intro/rows/CTA card shape used by
// app/jobs/actions.ts's application email, generalised since four triggers on
// top of one made the duplication worth collapsing into one template.

import "server-only";
import { Resend } from "resend";
import { formatDate, fullName, LEAVE_TYPE_LABELS, type LeaveRequest, type Staff } from "@/lib/hr";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Destiny Church <noreply@support.squaremediagroup.org>";

// Falls back to the same inbox the recruitment flow already notifies —
// avoids inventing a second unconfigured address.
const HR_INBOX = process.env.HR_NOTIFICATIONS_EMAIL || "techteam@destinytees.uk";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

interface HrCardOptions {
  to: string;
  subject: string;
  badge: string;
  heading: string;
  intro: string;
  rows: [string, string][];
  ctaHref?: string;
  ctaLabel?: string;
}

function hrCardHtml({ badge, heading, intro, rows, ctaHref, ctaLabel }: HrCardOptions): string {
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

async function sendHrCard(opts: HrCardOptions) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: hrCardHtml(opts),
  });
}

export async function sendLeaveRequestedEmail(
  request: Pick<LeaveRequest, "type" | "start_date" | "end_date" | "days" | "reason">,
  staff: Pick<Staff, "first_name" | "last_name">,
) {
  await sendHrCard({
    to: HR_INBOX,
    subject: `Leave request: ${fullName(staff)}`,
    badge: "Leave request",
    heading: "New leave request",
    intro: `${fullName(staff)} has requested ${LEAVE_TYPE_LABELS[request.type].toLowerCase()} leave.`,
    rows: [
      ["Type", LEAVE_TYPE_LABELS[request.type]],
      ["Dates", `${formatDate(request.start_date)} – ${formatDate(request.end_date)}`],
      ["Days", String(request.days)],
      ["Reason", request.reason || "—"],
    ],
    ctaHref: "https://destinytees.uk/admin/hr/leave",
    ctaLabel: "Review request",
  });
}

export async function sendLeaveDecisionEmail(
  request: Pick<LeaveRequest, "type" | "start_date" | "end_date" | "days" | "status">,
  staff: Pick<Staff, "first_name" | "last_name" | "email">,
) {
  if (!staff.email) return; // no email on file — nothing to send

  const approved = request.status === "approved";
  await sendHrCard({
    to: staff.email,
    subject: `Your leave request was ${request.status}`,
    badge: "Leave request",
    heading: approved ? "Leave approved" : "Leave rejected",
    intro: approved
      ? "Your leave request has been approved."
      : "Your leave request was not approved. Speak to your manager if you have questions.",
    rows: [
      ["Type", LEAVE_TYPE_LABELS[request.type]],
      ["Dates", `${formatDate(request.start_date)} – ${formatDate(request.end_date)}`],
      ["Days", String(request.days)],
    ],
    ctaHref: "https://destinytees.uk/portal/leave",
    ctaLabel: "View my leave",
  });
}

interface ReviewReminderItem {
  staffName: string;
  type: string;
  reviewer: string | null;
  nextReviewDate: string;
}

export async function sendReviewReminderDigest(items: ReviewReminderItem[]) {
  if (items.length === 0) return;

  await sendHrCard({
    to: HR_INBOX,
    subject: `${items.length} review${items.length === 1 ? "" : "s"} coming up`,
    badge: "Reviews",
    heading: "Reviews coming up",
    intro: `${items.length} review${items.length === 1 ? " is" : "s are"} due in the next two weeks.`,
    rows: items.map((item) => [
      item.staffName,
      `${item.type} — due ${formatDate(item.nextReviewDate)}${item.reviewer ? ` — ${item.reviewer}` : ""}`,
    ]),
    ctaHref: "https://destinytees.uk/admin/hr/reviews",
    ctaLabel: "View reviews",
  });
}
