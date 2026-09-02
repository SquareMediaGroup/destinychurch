// Server half of the design ticket queue: who is asking, and what they're
// allowed to do next.
//
// Two things live here that must not live anywhere else.
//
// 1. resolveRequesterIdentity — priority, verification and the staff link are
//    derived from the session cookie and an hr_staff lookup, never from the
//    submitted form. Otherwise "fast-track me" would be a checkbox anyone could
//    tick, and the tracking link could be aimed at someone else's inbox.
//
// 2. applyTransition — the single writer of design_tickets.status. Every route
//    that moves a ticket goes through it, so the workflow is enforced once,
//    server-side, for both the admin queue and the requester's tokenised page.
//    No route sets `status` directly.
import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";
import { getOrCreateBoard } from "@/lib/playbook.server";
import {
  MAX_CHANGE_REQUESTS,
  canTransition,
  uniqueEmails,
  type DesignActor,
  type DesignTicketCategory,
  type DesignTicketPriority,
  type DesignTicketStatus,
} from "@/lib/designTickets";

type ServiceClient = ReturnType<typeof createServiceClient>;

/** The one Playbook board every deliverable lands in. */
export const DESIGN_BOARD_TITLE = "Design Tickets";

/** The domain that gets the "sign in and we'll fast-track it" nudge. */
export const STAFF_EMAIL_DOMAIN = "@destinytees.uk";

export function isStaffEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(STAFF_EMAIL_DOMAIN);
}

/* ── Abuse plumbing ────────────────────────────────────────────────────────── */

/**
 * A honeypot field a person never sees and never fills. Anything in it means a
 * bot walked the form. Callers answer with the same shape as a success — a bot
 * that learns which of its submissions were rejected learns how to pass.
 */
export function isHoneypotTripped(raw: unknown): boolean {
  return typeof raw === "string" && raw.trim().length > 0;
}

/**
 * Salted sha256. Stored instead of the IP itself so the tickets table can be
 * throttled and audited without becoming a log of who visited the site from
 * where. Without a salt the hash is reversible by brute force — the IPv4 space
 * is small enough to enumerate in seconds.
 */
export function hashIp(ip: string): string {
  const salt = process.env.DESIGN_IP_SALT || process.env.MEDIA_IP_SALT || "";
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

/* ── Who is asking ─────────────────────────────────────────────────────────── */

export interface RequesterIdentity {
  authUserId: string | null;
  staffId: string | null;
  /** Proved by a live session, not by typing a staff-looking address. */
  verified: boolean;
  priority: DesignTicketPriority;
  /** The address to actually use — a linked staff record's wins over the form. */
  email: string;
  name: string;
  /** Signed in, but we couldn't match them to anyone. Shown, not enforced. */
  signedInButUnmatched: boolean;
}

/**
 * Fast-track means "a real member of the team asked". This codebase's own
 * definition of that is a linked hr_staff row (lib/staffPortalAuth.ts), so we
 * read it rather than folding it into admin_roles — that file is explicit that
 * portal linkage must never become an access level.
 *
 * The admin-role fallback covers the one realistic gap: a designer or site
 * admin with a login and no HR record, whose own requests would otherwise queue
 * behind the public. Everyone else who merely holds an account is not staff.
 *
 * A staff-domain address typed while signed out is accepted at normal priority
 * and soft-linked to the staff row by email, so it still shows up in /portal. It
 * is deliberately not fast-tracked and deliberately not blocked: an email domain
 * proves nothing, so refusing the submission would buy no safety while turning
 * away a real request from someone who can't sign in right now.
 */
export async function resolveRequesterIdentity(
  service: ServiceClient,
  formName: string,
  formEmail: string,
): Promise<RequesterIdentity> {
  const base: RequesterIdentity = {
    authUserId: null,
    staffId: null,
    verified: false,
    priority: "normal",
    email: formEmail.trim(),
    name: formName.trim(),
    signedInButUnmatched: false,
  };

  const jar = await cookies();
  const {
    data: { user },
  } = await createClient(jar).auth.getUser();

  if (!user) {
    // Signed out. Soft-link a staff address so /portal is still complete.
    const { data: staff } = await service
      .from("hr_staff")
      .select("id")
      .ilike("email", base.email)
      .maybeSingle();
    return { ...base, staffId: staff?.id ?? null };
  }

  base.authUserId = user.id;

  const { data: staff } = await service
    .from("hr_staff")
    .select("id, email, first_name, last_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (staff) {
    return {
      ...base,
      staffId: staff.id,
      verified: true,
      priority: "fast_track",
      // The staff record's address wins. Otherwise someone signed in could aim
      // the tracking link — and the finished files — at an inbox not their own.
      email: staff.email || base.email,
      name: base.name || [staff.first_name, staff.last_name].filter(Boolean).join(" "),
    };
  }

  const roles = await getRoles(service, user.id);
  if (Object.values(roles).some(Boolean)) {
    return { ...base, verified: true, priority: "fast_track" };
  }

  return { ...base, signedInButUnmatched: true };
}

/* ── Boards ────────────────────────────────────────────────────────────────── */

/**
 * The board this ticket's files go in, resolved lazily and cached on the row.
 *
 * One shared board rather than one per ticket: nothing here ever lists a board
 * — assets are always found through our own design_ticket_deliverables rows —
 * so per-ticket boards would only fill the DAM with near-empty collections.
 * Context goes in the asset title instead ("DT-0007 r2 — poster.pdf"). Storing
 * the token per ticket keeps the other choice open as a backfill.
 */
export async function designBoardToken(
  service: ServiceClient,
  ticket: { id: string; playbook_board_token: string | null },
): Promise<string> {
  if (ticket.playbook_board_token) return ticket.playbook_board_token;
  const token = await getOrCreateBoard(DESIGN_BOARD_TITLE);
  await service
    .from("design_tickets")
    .update({ playbook_board_token: token })
    .eq("id", ticket.id);
  return token;
}

/* ── Who the design team is ────────────────────────────────────────────────── */

/**
 * Everyone who should hear about a design request: holders of the design role,
 * plus super admins — who can open the queue anyway, and are the people expected
 * to notice when nobody has picked something up.
 *
 * Read live rather than kept in an env var so that granting someone the role on
 * /admin/users is all it takes to put them in the loop. Keeping a separate list
 * of addresses in step with the roles is exactly the step that doesn't get done,
 * and the failure is silent.
 *
 * Deduplicated case-insensitively: someone holding both roles is one recipient,
 * not two copies of the same mail.
 *
 * The caller falls back to the shared inbox when this is empty, so an admin_roles
 * table with no addresses degrades to "someone still gets it" rather than
 * "requests quietly stop being announced".
 */
export async function designTeamEmails(service: ServiceClient): Promise<string[]> {
  const { data } = await service
    .from("admin_roles")
    .select("email")
    .or("design_admin.eq.true,super_admin.eq.true");

  return uniqueEmails((data ?? []).map((row) => row.email));
}

/* ── Moving a ticket ───────────────────────────────────────────────────────── */

export interface TransitionActor {
  type: DesignActor;
  name?: string | null;
  email?: string | null;
  authUserId?: string | null;
}

export interface TransitionResult {
  ok: boolean;
  status: number;
  error?: string;
  ticket?: Record<string, unknown>;
}

/**
 * Move a ticket, or explain why not. The only writer of `status`.
 *
 * Re-reads the row first rather than trusting a status the caller passed in:
 * two designers with the queue open in two tabs is the normal case, not the
 * exotic one, and the second click must lose cleanly instead of overwriting.
 */
export async function applyTransition(
  service: ServiceClient,
  ticketId: string,
  to: DesignTicketStatus,
  actor: TransitionActor,
  body?: string | null,
): Promise<TransitionResult> {
  const { data: ticket } = await service
    .from("design_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return { ok: false, status: 404, error: "Ticket not found" };

  const from = ticket.status as DesignTicketStatus;
  if (from === to) return { ok: true, status: 200, ticket };

  if (!canTransition(from, to, actor.type)) {
    return {
      ok: false,
      status: 409,
      error: `A ticket that is ${from.replace(/_/g, " ")} can't be moved to ${to.replace(/_/g, " ")}.`,
    };
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status: to, last_activity_at: now };
  let kind: "status" | "change_request" = "status";

  if (to === "claimed") {
    update.assignee_email = actor.email ?? null;
    update.assignee_name = actor.name ?? null;
    update.assignee_auth_user_id = actor.authUserId ?? null;
    update.assigned_at = now;
  }

  if (to === "open") {
    // Unclaiming. Put it back exactly as it was, or the queue shows a ticket
    // that is open and somehow still has an owner.
    update.assignee_email = null;
    update.assignee_name = null;
    update.assignee_auth_user_id = null;
    update.assigned_at = null;
  }

  if (to === "delivered") {
    // Checked here rather than in the page, because a disabled button is a
    // courtesy and a POST is not. "Delivered" with nothing to download is the
    // one state that would make the requester's email a lie.
    const { count } = await service
      .from("design_ticket_deliverables")
      .select("id", { count: "exact", head: true })
      .eq("ticket_id", ticketId)
      .eq("revision", ticket.revision);

    if (!count) {
      return {
        ok: false,
        status: 422,
        error: "Upload at least one file for this revision before marking it delivered.",
      };
    }
    update.delivered_at = now;
  }

  if (to === "changes_requested") {
    if (!body || !body.trim()) {
      return { ok: false, status: 422, error: "Please say what needs changing." };
    }

    const { count } = await service
      .from("design_ticket_events")
      .select("id", { count: "exact", head: true })
      .eq("ticket_id", ticketId)
      .eq("kind", "change_request");

    if ((count ?? 0) >= MAX_CHANGE_REQUESTS) {
      // At this point it isn't a design problem any more. Cancelling stays
      // available; so does talking to someone.
      return {
        ok: false,
        status: 422,
        error:
          "This request has been round several times already — please speak to the design team directly so we can get it right.",
      };
    }

    update.revision = ticket.revision + 1;
    update.delivered_at = null;
    kind = "change_request";
  }

  if (to === "closed") update.closed_at = now;
  if (to === "cancelled") {
    update.resolution_note = body?.trim() || ticket.resolution_note;
    update.closed_at = now;
  }

  const { data: updated, error } = await service
    .from("design_tickets")
    .update(update)
    .eq("id", ticketId)
    // Optimistic concurrency: if someone else moved it between our read and our
    // write, this matches nothing and we report the conflict instead of winning.
    .eq("status", from)
    .select()
    .single();

  if (error || !updated) {
    return {
      ok: false,
      status: 409,
      error: "Someone else just changed this ticket — reload and try again.",
    };
  }

  await service.from("design_ticket_events").insert({
    ticket_id: ticketId,
    kind,
    actor_type: actor.type,
    actor_name: actor.name ?? null,
    actor_email: actor.email ?? null,
    from_status: from,
    to_status: to,
    body: body?.trim() || null,
    is_internal: false,
  });

  return { ok: true, status: 200, ticket: updated };
}

/* ── Reads ─────────────────────────────────────────────────────────────────── */

/** The ticket behind a share token, or null. */
export async function getTicketByToken(service: ServiceClient, token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const { data } = await service
    .from("design_tickets")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return data;
}

/**
 * Everything a requester is allowed to see, hand-built.
 *
 * Deliberately not a select("*") passthrough: the defence against leaking the
 * next column someone adds — an IP hash, an internal note, the assignee's email
 * — is that this function has to be edited for a field to become visible.
 */
export interface TicketRow {
  id: string;
  ref: number;
  title: string;
  brief: string;
  category: DesignTicketCategory;
  needed_by: string | null;
  specs: string | null;
  status: DesignTicketStatus;
  revision: number;
  assignee_name: string | null;
  requester_name: string;
  created_at: string;
  delivered_at: string | null;
  closed_at: string | null;
  resolution_note: string | null;
}

export async function requesterView(service: ServiceClient, ticket: TicketRow) {
  const id = ticket.id;

  const [{ data: deliverables }, { data: events }] = await Promise.all([
    service
      .from("design_ticket_deliverables")
      .select("id, ticket_id, revision, file_name, mime_type, size_bytes, created_at")
      .eq("ticket_id", id)
      .order("revision", { ascending: false })
      .order("created_at", { ascending: false }),
    service
      .from("design_ticket_events")
      .select("id, ticket_id, kind, actor_type, actor_name, from_status, to_status, body, created_at")
      .eq("ticket_id", id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true }),
  ]);

  const changeRequests = (events ?? []).filter((e) => e.kind === "change_request").length;

  return {
    ref: ticket.ref,
    title: ticket.title,
    brief: ticket.brief,
    category: ticket.category,
    needed_by: ticket.needed_by,
    specs: ticket.specs,
    status: ticket.status,
    revision: ticket.revision,
    // Name only. A requester never needs the designer's email address, and
    // publishing one on a link-shareable page is how it ends up scraped.
    designer_name: ticket.assignee_name ?? null,
    requester_name: ticket.requester_name,
    created_at: ticket.created_at,
    delivered_at: ticket.delivered_at,
    closed_at: ticket.closed_at,
    resolution_note: ticket.resolution_note,
    change_requests_used: changeRequests,
    deliverables: deliverables ?? [],
    // actor_email is dropped in the select above, so a designer's address can't
    // ride along in the thread either.
    events: events ?? [],
  };
}
