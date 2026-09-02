import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { recordAudit } from "@/lib/audit.server";
import { ticketRef } from "@/lib/designTickets";

/**
 * A note on the thread. `is_internal` decides whether the requester ever sees
 * it — an internal note is how a designer leaves themselves a reminder about a
 * brief that doesn't quite add up without saying so to the person who wrote it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const h = await headers();

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Write something first" }, { status: 400 });

  const isInternal = body.is_internal !== false;
  const actorEmail = h.get(AUDIT_ACTOR_HEADERS.email);
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("design_tickets")
    .select("id, ref, title")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("design_ticket_events")
    .insert({
      ticket_id: id,
      kind: "note",
      actor_type: "designer",
      actor_name: actorEmail?.split("@")[0] ?? null,
      actor_email: actorEmail,
      body: text,
      is_internal: isInternal,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("design_tickets")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", id);

  await recordAudit({
    action: "update",
    section: "design",
    entity: "design ticket",
    entityId: id,
    entityLabel: ticket.title,
    summary: `Added ${isInternal ? "an internal" : "a"} note to the design ticket ${ticketRef(ticket.ref)} “${ticket.title}”`,
    // The note itself is in the thread; repeating it in the audit diff would
    // put an internal remark somewhere the requester's own ticket doesn't hide it.
    after: { kind: "note", is_internal: isInternal },
  });

  return NextResponse.json(data, { status: 201 });
}
