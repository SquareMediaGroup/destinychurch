import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { deleteAsset } from "@/lib/playbook.server";
import { ticketRef } from "@/lib/designTickets";

/** One ticket, with its thread and its files — everything the detail page draws. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: ticket, error } = await supabase
    .from("design_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const [{ data: deliverables }, { data: events }] = await Promise.all([
    supabase
      .from("design_ticket_deliverables")
      .select("*")
      .eq("ticket_id", id)
      .order("revision", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("design_ticket_events")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({
    ticket,
    deliverables: deliverables ?? [],
    events: events ?? [],
  });
}

// Status is deliberately absent: it moves only through applyTransition, via
// the /status route, so the workflow can't be sidestepped by a PATCH.
const EDITABLE = [
  "title",
  "brief",
  "category",
  "needed_by",
  "specs",
  "priority",
  "requester_name",
  "requester_email",
  "requester_phone",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }
  update.last_activity_at = new Date().toISOString();

  const supabase = createServiceClient();
  const before = await readForAudit("design_tickets", id);
  const { data, error } = await supabase
    .from("design_tickets")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update",
    section: "design",
    entity: "design ticket",
    entityId: id,
    entityLabel: data.title,
    summary: `Edited the design ticket ${ticketRef(data.ref)} “${data.title}”`,
    before,
    after: update,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("design_tickets", id);

  // The rows cascade, but Playbook doesn't know about our foreign keys — clear
  // the assets first or deleting a ticket silently leaves its files in the DAM
  // with nothing left pointing at them.
  const { data: files } = await supabase
    .from("design_ticket_deliverables")
    .select("playbook_asset_token")
    .eq("ticket_id", id);

  for (const file of files ?? []) {
    try {
      await deleteAsset(file.playbook_asset_token);
    } catch (err) {
      // A DAM hiccup shouldn't strand the ticket. Log the orphan by name so it
      // can be cleared by hand rather than becoming invisible.
      console.error(`🗑️ Playbook asset ${file.playbook_asset_token} not deleted:`, err);
    }
  }

  const { error } = await supabase.from("design_tickets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "design",
    entity: "design ticket",
    entityId: id,
    entityLabel: (before?.title as string) ?? null,
    summary: `Deleted the design ticket ${before?.ref ? ticketRef(before.ref as number) : id} “${before?.title ?? ""}”`,
    before,
  });

  return NextResponse.json({ success: true });
}
