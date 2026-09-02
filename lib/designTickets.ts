// The shared vocabulary of the design ticket queue: what the statuses are,
// what they're called in front of a person, and which moves between them are
// legal.
//
// Client-safe on purpose. Both admin pages are "use client" and the requester's
// tracking page renders the same labels, so nothing server-only may be imported
// here — the server half lives in lib/designTickets.server.ts.
//
// canTransition is the single definition of the workflow. The UI uses it to
// decide which buttons to draw, and applyTransition() uses it to decide whether
// to honour the request; the second one is the check that matters, because a
// disabled button is a courtesy and a POST is not.

export type DesignTicketStatus =
  | "open"
  | "claimed"
  | "in_progress"
  | "delivered"
  | "changes_requested"
  | "closed"
  | "cancelled";

export type DesignTicketPriority = "normal" | "fast_track";

export type DesignTicketCategory =
  | "social"
  | "print"
  | "apparel"
  | "signage"
  | "web"
  | "video"
  | "other";

/** Who is asking for the move. Requesters get a deliberately small set. */
export type DesignActor = "designer" | "requester";

export const DESIGN_STATUSES: DesignTicketStatus[] = [
  "open",
  "claimed",
  "in_progress",
  "delivered",
  "changes_requested",
  "closed",
  "cancelled",
];

export const DESIGN_STATUS_LABELS: Record<DesignTicketStatus, string> = {
  open: "Open",
  claimed: "Claimed",
  in_progress: "In progress",
  delivered: "Delivered",
  changes_requested: "Changes requested",
  closed: "Closed",
  cancelled: "Cancelled",
};

/** AdminUI <Badge> tones. */
export const DESIGN_STATUS_TONE: Record<DesignTicketStatus, string> = {
  open: "blue",
  claimed: "purple",
  in_progress: "orange",
  delivered: "green",
  changes_requested: "red",
  closed: "grey",
  cancelled: "grey",
};

/**
 * What the requester is told each status means. The admin labels are shorthand
 * for people who live in the queue; someone who filed one request three weeks
 * ago needs the sentence.
 */
export const DESIGN_STATUS_BLURB: Record<DesignTicketStatus, string> = {
  open: "We've got your request and it's waiting to be picked up.",
  claimed: "A designer has picked this up and will start shortly.",
  in_progress: "Someone is working on this now.",
  delivered: "Your files are ready to download.",
  changes_requested: "We're working through the changes you asked for.",
  closed: "All done. Your files stay downloadable here.",
  cancelled: "This request was cancelled.",
};

/** Queue order — the pill row and the default sort both read from this. */
export const DESIGN_STATUS_ORDER: DesignTicketStatus[] = [
  "open",
  "claimed",
  "in_progress",
  "changes_requested",
  "delivered",
  "closed",
  "cancelled",
];

/** Everything still needing someone to do something. The queue's default view. */
export const OPEN_STATUSES: DesignTicketStatus[] = [
  "open",
  "claimed",
  "in_progress",
  "changes_requested",
  "delivered",
];

export const TERMINAL_STATUSES: DesignTicketStatus[] = ["closed", "cancelled"];

export const DESIGN_CATEGORY_LABELS: Record<DesignTicketCategory, string> = {
  social: "Social media",
  print: "Print",
  apparel: "Apparel",
  signage: "Signage",
  web: "Web",
  video: "Video",
  other: "Something else",
};

export const DESIGN_PRIORITY_LABELS: Record<DesignTicketPriority, string> = {
  normal: "Normal",
  fast_track: "Fast-tracked",
};

/**
 * A request that has been round this many times is not a design problem any
 * more, it's a conversation that needs to happen out loud. The cap stops the
 * delivered → changes_requested loop being ridden forever by one requester.
 */
export const MAX_CHANGE_REQUESTS = 5;

/* ── The state machine ─────────────────────────────────────────────────────── */

const TRANSITIONS: Record<
  DesignTicketStatus,
  { to: DesignTicketStatus; actors: DesignActor[] }[]
> = {
  open: [
    { to: "claimed", actors: ["designer"] },
    { to: "cancelled", actors: ["designer", "requester"] },
  ],
  claimed: [
    // Unclaiming matters: someone picks a ticket up, realises it's not theirs,
    // and needs to put it back without cancelling it.
    { to: "open", actors: ["designer"] },
    { to: "in_progress", actors: ["designer"] },
    { to: "cancelled", actors: ["designer", "requester"] },
  ],
  in_progress: [
    { to: "delivered", actors: ["designer"] },
    { to: "cancelled", actors: ["designer", "requester"] },
  ],
  delivered: [
    { to: "changes_requested", actors: ["designer", "requester"] },
    { to: "closed", actors: ["designer", "requester"] },
    { to: "cancelled", actors: ["designer", "requester"] },
  ],
  changes_requested: [
    { to: "in_progress", actors: ["designer"] },
    { to: "cancelled", actors: ["designer", "requester"] },
  ],
  closed: [],
  cancelled: [],
};

export function canTransition(
  from: DesignTicketStatus,
  to: DesignTicketStatus,
  actor: DesignActor,
): boolean {
  return TRANSITIONS[from].some((t) => t.to === to && t.actors.includes(actor));
}

/** The moves this actor could make from here — what the UI draws buttons for. */
export function nextStatuses(
  from: DesignTicketStatus,
  actor: DesignActor,
): DesignTicketStatus[] {
  return TRANSITIONS[from].filter((t) => t.actors.includes(actor)).map((t) => t.to);
}

/** The button text for a move, which is rarely just the destination's name. */
export const TRANSITION_LABELS: Partial<
  Record<`${DesignTicketStatus}:${DesignTicketStatus}`, string>
> = {
  "open:claimed": "Claim this",
  "claimed:open": "Unclaim",
  "claimed:in_progress": "Start work",
  "changes_requested:in_progress": "Resume work",
  "in_progress:delivered": "Mark delivered",
  "delivered:changes_requested": "Request changes",
  "delivered:closed": "Close",
};

export function transitionLabel(
  from: DesignTicketStatus,
  to: DesignTicketStatus,
): string {
  return TRANSITION_LABELS[`${from}:${to}`] ?? DESIGN_STATUS_LABELS[to];
}

/* ── Display ───────────────────────────────────────────────────────────────── */

/** "DT-0007" — what a ticket is called out loud and in an email subject. */
export function ticketRef(ref: number): string {
  return `DT-${String(ref).padStart(4, "0")}`;
}

export function isFastTrack(ticket: { priority: DesignTicketPriority }): boolean {
  return ticket.priority === "fast_track";
}

/* ── Shapes ────────────────────────────────────────────────────────────────── */

export interface DesignTicket {
  id: string;
  ref: number;
  title: string;
  brief: string;
  category: DesignTicketCategory;
  needed_by: string | null;
  specs: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  requester_staff_id: string | null;
  requester_verified: boolean;
  priority: DesignTicketPriority;
  status: DesignTicketStatus;
  revision: number;
  assignee_email: string | null;
  assignee_name: string | null;
  assigned_at: string | null;
  share_token: string;
  delivered_at: string | null;
  closed_at: string | null;
  resolution_note: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface DesignDeliverable {
  id: string;
  ticket_id: string;
  revision: number;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by_email: string | null;
  created_at: string;
}

export interface DesignTicketEvent {
  id: string;
  ticket_id: string;
  kind: "status" | "note" | "change_request";
  actor_type: "requester" | "designer" | "system";
  actor_name: string | null;
  actor_email: string | null;
  from_status: DesignTicketStatus | null;
  to_status: DesignTicketStatus | null;
  body: string | null;
  is_internal: boolean;
  created_at: string;
}

/**
 * The requester-facing shapes, narrower than the admin ones on purpose.
 *
 * A deliverable loses `uploaded_by_email` and an event loses `actor_email` and
 * `is_internal`: a designer's address has no business on a page whose only
 * credential is a link, and the internal flag would tell a requester that
 * notes they can't see exist. requesterView() in designTickets.server.ts is
 * what enforces it — these types are what make forgetting a compile error.
 */
export type RequesterDeliverable = Omit<DesignDeliverable, "uploaded_by_email">;

export type RequesterEvent = Omit<DesignTicketEvent, "actor_email" | "is_internal">;

/** What the requester's tokenised page and /portal are allowed to see. */
export interface RequesterTicketView {
  ref: number;
  title: string;
  brief: string;
  category: DesignTicketCategory;
  needed_by: string | null;
  specs: string | null;
  status: DesignTicketStatus;
  revision: number;
  designer_name: string | null;
  requester_name: string;
  created_at: string;
  delivered_at: string | null;
  closed_at: string | null;
  resolution_note: string | null;
  change_requests_used: number;
  deliverables: RequesterDeliverable[];
  events: RequesterEvent[];
}

/** Bytes as something a person reads. */
export function fileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
