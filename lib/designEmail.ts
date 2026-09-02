// Design ticket notifications, on the shared card from lib/emailCard.ts.
//
// Two rules hold everywhere in this file.
//
// 1. Every send is fire-and-forget at the call site. A Resend outage must never
//    turn into a failed claim or a rejected delivery — the same rule
//    app/api/admin/hr/leave/[id]/route.ts states for leave decisions.
//
// 2. A deliverable's URL is never in an email. Playbook display URLs are signed
//    and expire in about a day, so a link mailed on Tuesday is broken by
//    Thursday and reads to the requester as lost work. Emails carry the
//    tracking-page link instead, and that page mints a fresh URL per click.
import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { sendEmailCard } from "@/lib/emailCard";
import { designTeamEmails } from "@/lib/designTickets.server";
import {
  DESIGN_CATEGORY_LABELS,
  ticketRef,
  uniqueEmails,
  type DesignTicketCategory,
} from "@/lib/designTickets";

// Only a fallback now. The real recipients are whoever holds the design role;
// this catches the case where nobody does, so a request can't arrive unannounced.
const DESIGN_FALLBACK_INBOX =
  process.env.DESIGN_NOTIFICATIONS_EMAIL || "techteam@destinytees.uk";

/**
 * Who to tell about a new request or a change request: the design team and the
 * super admins, or the shared inbox if that somehow resolves to nobody. Resolved
 * per send rather than cached, so revoking a role takes someone off the list
 * immediately.
 */
async function designRecipients(): Promise<string[]> {
  try {
    const team = await designTeamEmails(createServiceClient());
    if (team.length > 0) return team;
  } catch (err) {
    // A lookup failure must not swallow the notification entirely.
    console.error("📧 Couldn't read the design team, using the fallback inbox:", err);
  }
  return [DESIGN_FALLBACK_INBOX];
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://destinytees.uk";

export function trackingUrl(shareToken: string): string {
  return `${SITE}/design-request/${shareToken}`;
}

function adminUrl(ticketId: string): string {
  return `${SITE}/admin/design/${ticketId}`;
}

export interface TicketEmailFields {
  id: string;
  ref: number;
  title: string;
  brief: string;
  category: DesignTicketCategory;
  needed_by: string | null;
  priority: "normal" | "fast_track";
  requester_name: string;
  requester_email: string;
  share_token: string;
}

function neededByLabel(needed_by: string | null): string {
  if (!needed_by) return "No fixed date";
  return new Date(`${needed_by}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Submission ────────────────────────────────────────────────────────────── */

/** To the requester. The only place the share token is ever sent. */
export async function sendRequestReceivedEmail(ticket: TicketEmailFields) {
  await sendEmailCard({
    to: ticket.requester_email,
    subject: `${ticketRef(ticket.ref)} — we've got your design request`,
    badge: "Design request",
    heading: "We've got it",
    intro:
      "Thanks — your request is with the design team. You can follow it, and download the finished files, from the link below. It's worth keeping.",
    rows: [
      ["Reference", ticketRef(ticket.ref)],
      ["What you asked for", ticket.title],
      ["Type", DESIGN_CATEGORY_LABELS[ticket.category]],
      ["Needed by", neededByLabel(ticket.needed_by)],
    ],
    ctaHref: trackingUrl(ticket.share_token),
    ctaLabel: "Track this request",
  });
}

/** To the design team and the super admins. */
export async function sendNewRequestAlert(ticket: TicketEmailFields) {
  const fast = ticket.priority === "fast_track";
  await sendEmailCard({
    to: await designRecipients(),
    subject: `${fast ? "[Fast-track] " : ""}${ticketRef(ticket.ref)} — ${ticket.title}`,
    badge: fast ? "Fast-tracked request" : "New design request",
    heading: ticket.title,
    intro: `${ticket.requester_name} has asked for something.`,
    rows: [
      ["Reference", ticketRef(ticket.ref)],
      ["From", `${ticket.requester_name} (${ticket.requester_email})`],
      ["Type", DESIGN_CATEGORY_LABELS[ticket.category]],
      ["Needed by", neededByLabel(ticket.needed_by)],
      ["Priority", fast ? "Fast-tracked (signed-in staff)" : "Normal"],
      ["Brief", ticket.brief],
    ],
    ctaHref: adminUrl(ticket.id),
    ctaLabel: "Open the ticket",
  });
}

/* ── Progress ──────────────────────────────────────────────────────────────── */

export async function sendClaimedEmail(
  ticket: Pick<TicketEmailFields, "ref" | "title" | "requester_email" | "share_token">,
  designerName: string | null,
) {
  const who = designerName || "One of the design team";
  await sendEmailCard({
    to: ticket.requester_email,
    subject: `${ticketRef(ticket.ref)} — someone's picked this up`,
    badge: "In hand",
    heading: `${who} has picked this up`,
    intro: "We'll let you know as soon as there's something to look at.",
    rows: [
      ["Reference", ticketRef(ticket.ref)],
      ["Request", ticket.title],
      ["Designer", who],
    ],
    ctaHref: trackingUrl(ticket.share_token),
    ctaLabel: "Track this request",
  });
}

export async function sendDeliveredEmail(
  ticket: Pick<TicketEmailFields, "ref" | "title" | "requester_email" | "share_token">,
  fileCount: number,
) {
  await sendEmailCard({
    to: ticket.requester_email,
    subject: `${ticketRef(ticket.ref)} — your files are ready`,
    badge: "Ready",
    heading: "Your design is ready",
    intro:
      "Open the link below to download it. If something isn't right, there's a button there to ask for changes.",
    rows: [
      ["Reference", ticketRef(ticket.ref)],
      ["Request", ticket.title],
      ["Files", `${fileCount} ${fileCount === 1 ? "file" : "files"} ready to download`],
    ],
    ctaHref: trackingUrl(ticket.share_token),
    ctaLabel: "Download your files",
  });
}

/**
 * To the design team, plus the assignee if they aren't already on it — a
 * designer who has since had their role revoked still wants to hear that the
 * thing they were working on has come back.
 */
export async function sendChangesRequestedAlert(
  ticket: Pick<TicketEmailFields, "id" | "ref" | "title" | "requester_name">,
  note: string,
  assigneeEmail: string | null,
) {
  const team = await designRecipients();
  const recipients = uniqueEmails([...team, assigneeEmail]);

  await sendEmailCard({
    to: recipients,
    subject: `${ticketRef(ticket.ref)} — changes requested`,
    badge: "Changes requested",
    heading: ticket.title,
    intro: `${ticket.requester_name} has asked for changes.`,
    rows: [
      ["Reference", ticketRef(ticket.ref)],
      ["What they said", note],
    ],
    ctaHref: adminUrl(ticket.id),
    ctaLabel: "Open the ticket",
  });
}

/* ── Endings ───────────────────────────────────────────────────────────────── */

export async function sendClosedEmail(
  ticket: Pick<TicketEmailFields, "ref" | "title" | "requester_email" | "share_token">,
) {
  await sendEmailCard({
    to: ticket.requester_email,
    subject: `${ticketRef(ticket.ref)} — closed`,
    badge: "Closed",
    heading: "That's this one done",
    intro:
      "Thanks. Your files stay downloadable from the link below, so hang onto it rather than asking us to send them again.",
    rows: [
      ["Reference", ticketRef(ticket.ref)],
      ["Request", ticket.title],
    ],
    ctaHref: trackingUrl(ticket.share_token),
    ctaLabel: "Download your files",
  });
}

export async function sendCancelledEmail(
  ticket: Pick<TicketEmailFields, "ref" | "title" | "requester_email">,
  reason: string | null,
) {
  await sendEmailCard({
    to: ticket.requester_email,
    subject: `${ticketRef(ticket.ref)} — cancelled`,
    badge: "Cancelled",
    heading: "This request has been cancelled",
    intro:
      "If that's not what you expected, reply to this email and we'll pick it back up.",
    rows: [
      ["Reference", ticketRef(ticket.ref)],
      ["Request", ticket.title],
      ["Reason", reason || "No reason given"],
    ],
  });
}
