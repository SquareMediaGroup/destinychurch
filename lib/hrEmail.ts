// HR notification emails — leave requests, decisions, and the review-reminder
// digest. The card itself now lives in lib/emailCard.ts, shared with the design
// ticket queue; this file is just the HR-specific copy and recipients.

import "server-only";
import { sendEmailCard } from "@/lib/emailCard";
import { formatDate, fullName, LEAVE_TYPE_LABELS, type LeaveRequest, type Staff } from "@/lib/hr";

// Falls back to the same inbox the recruitment flow already notifies —
// avoids inventing a second unconfigured address.
const HR_INBOX = process.env.HR_NOTIFICATIONS_EMAIL || "techteam@destinytees.uk";

export async function sendLeaveRequestedEmail(
  request: Pick<LeaveRequest, "type" | "start_date" | "end_date" | "days" | "reason">,
  staff: Pick<Staff, "first_name" | "last_name">,
) {
  await sendEmailCard({
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
  await sendEmailCard({
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

  await sendEmailCard({
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
