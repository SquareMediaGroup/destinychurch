import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { recordAudit } from "@/lib/audit.server";
import { ticketRef } from "@/lib/designTickets";

// The queue. The whole collection comes back in one GET and is filtered
// client-side by lib/useAdminList — the same shape every other admin list uses,
// and the right one while a church's design backlog is measured in dozens.
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("design_tickets")
    .select("*")
    // Fast-tracked first within a status, then oldest first: the queue should
    // read as "what to pick up next", not "what arrived last".
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deliverable counts in one round trip rather than N — the queue shows a
  // "3 files" chip per row and nothing else needs the rows themselves.
  const { data: files } = await supabase
    .from("design_ticket_deliverables")
    .select("ticket_id, revision");

  const counts = new Map<string, number>();
  for (const f of files ?? []) {
    counts.set(f.ticket_id, (counts.get(f.ticket_id) ?? 0) + 1);
  }

  return NextResponse.json(
    (data ?? []).map((t) => ({ ...t, deliverable_count: counts.get(t.id) ?? 0 })),
  );
}

const CATEGORIES = ["social", "print", "apparel", "signage", "web", "video", "other"];

/** A designer filing a ticket on someone's behalf — a phone call, a corridor ask. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const h = await headers();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  const requesterName =
    typeof body.requester_name === "string" ? body.requester_name.trim() : "";
  const requesterEmail =
    typeof body.requester_email === "string" ? body.requester_email.trim() : "";

  if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
  if (!brief) return NextResponse.json({ error: "A brief is required" }, { status: 400 });
  if (!requesterName || !requesterEmail) {
    return NextResponse.json(
      { error: "Who it's for — name and email — is required" },
      { status: 400 },
    );
  }

  const category = CATEGORIES.includes(body.category) ? body.category : "other";
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("design_tickets")
    .insert({
      title,
      brief,
      category,
      needed_by: body.needed_by || null,
      specs: typeof body.specs === "string" ? body.specs.trim() || null : null,
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_phone: body.requester_phone || null,
      // Raised inside the admin by someone who knows the requester, so it is
      // verified in the sense that matters, and fast-tracked by default.
      requester_verified: true,
      priority: body.priority === "normal" ? "normal" : "fast_track",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("design_ticket_events").insert({
    ticket_id: data.id,
    kind: "status",
    actor_type: "designer",
    actor_email: h.get(AUDIT_ACTOR_HEADERS.email),
    to_status: "open",
    body: `Raised on behalf of ${requesterName}.`,
  });

  await recordAudit({
    action: "create",
    section: "design",
    entity: "design ticket",
    entityId: data.id,
    entityLabel: data.title,
    summary: `Raised the design ticket ${ticketRef(data.ref)} “${data.title}”`,
    after: data,
  });

  return NextResponse.json(data, { status: 201 });
}
