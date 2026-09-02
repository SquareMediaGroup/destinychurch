import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { applyTransition } from "@/lib/designTickets.server";
import {
  DESIGN_STATUS_LABELS,
  DESIGN_STATUSES,
  ticketRef,
  type DesignTicketStatus,
} from "@/lib/designTickets";
import {
  sendCancelledEmail,
  sendClaimedEmail,
  sendClosedEmail,
  sendDeliveredEmail,
} from "@/lib/designEmail";

/**
 * Every designer-side move: claim, unclaim, start, deliver, close, cancel,
 * reopen. One route rather than seven, because they are one decision — is this
 * move legal for this actor from this state — and applyTransition answers it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const h = await headers();

  const to = body.to as DesignTicketStatus;
  if (!DESIGN_STATUSES.includes(to)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }

  const actorEmail = h.get(AUDIT_ACTOR_HEADERS.email);
  const supabase = createServiceClient();
  const before = await readForAudit("design_tickets", id);

  const result = await applyTransition(
    supabase,
    id,
    to,
    {
      type: "designer",
      // The name shown to the requester. Falls back to the local part of the
      // address rather than printing a full email on a link-shareable page.
      name: typeof body.actor_name === "string" && body.actor_name.trim()
        ? body.actor_name.trim()
        : (actorEmail?.split("@")[0] ?? null),
      email: actorEmail,
      authUserId: h.get(AUDIT_ACTOR_HEADERS.id),
    },
    typeof body.body === "string" ? body.body : null,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const ticket = result.ticket as Record<string, string & number>;

  await recordAudit({
    action: "update",
    section: "design",
    entity: "design ticket",
    entityId: id,
    entityLabel: ticket.title,
    summary: `Moved the design ticket ${ticketRef(Number(ticket.ref))} “${ticket.title}” to ${DESIGN_STATUS_LABELS[to].toLowerCase()}`,
    before,
    after: result.ticket,
  });

  // Fire-and-forget: a Resend outage must never turn into a failed transition.
  // The ticket has already moved; the email is a courtesy on top of it.
  try {
    const fields = {
      ref: Number(ticket.ref),
      title: String(ticket.title),
      requester_email: String(ticket.requester_email),
      share_token: String(ticket.share_token),
    };
    if (to === "claimed") {
      await sendClaimedEmail(fields, ticket.assignee_name ?? null);
    } else if (to === "delivered") {
      const { count } = await supabase
        .from("design_ticket_deliverables")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", id)
        .eq("revision", Number(ticket.revision));
      await sendDeliveredEmail(fields, count ?? 0);
    } else if (to === "closed") {
      await sendClosedEmail(fields);
    } else if (to === "cancelled") {
      await sendCancelledEmail(fields, ticket.resolution_note ?? null);
    }
  } catch (err) {
    console.error("📧 Design ticket status email failed:", err);
  }

  return NextResponse.json(result.ticket);
}
