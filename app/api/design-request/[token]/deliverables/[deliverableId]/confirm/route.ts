import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getTicketByToken } from "@/lib/designTickets.server";

// The requester's own sign-off: "I have this, you can delete it." Sets a
// timestamp the purge cron reads — see the design_deliverable_confirm_delete
// migration for the 48h floor and why it's a floor, not an exact deadline.
//
// Idempotent on purpose: confirming twice keeps the original timestamp rather
// than pushing the deletion window back out, so re-clicking the button after
// a page refresh can't be used to keep a file alive indefinitely.
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string; deliverableId: string }> },
) {
  const { token, deliverableId } = await params;
  const supabase = createServiceClient();

  const ticket = await getTicketByToken(supabase, token);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: file } = await supabase
    .from("design_ticket_deliverables")
    .select("id, storage_kind, confirmed_at")
    .eq("id", deliverableId)
    .eq("ticket_id", ticket.id)
    .maybeSingle();

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (file.storage_kind === "link") {
    // Nothing of ours to schedule for deletion — a link owns no bytes.
    return NextResponse.json({ error: "This file can't be confirmed for deletion" }, { status: 400 });
  }

  if (file.confirmed_at) {
    return NextResponse.json({ confirmed_at: file.confirmed_at });
  }

  const confirmedAt = new Date().toISOString();
  const { error } = await supabase
    .from("design_ticket_deliverables")
    .update({ confirmed_at: confirmedAt, confirmed_by_email: ticket.requester_email })
    .eq("id", deliverableId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ confirmed_at: confirmedAt });
}
