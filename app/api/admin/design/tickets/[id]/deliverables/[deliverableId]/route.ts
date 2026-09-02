import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { deleteDeliverableStorage } from "@/lib/designTickets.server";
import { ticketRef } from "@/lib/designTickets";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; deliverableId: string }> },
) {
  const { id, deliverableId } = await params;
  const supabase = createServiceClient();

  // Scoped to the ticket in the URL, not just the deliverable id. A uuid feels
  // unguessable, which is exactly why the check gets left out.
  const { data: file } = await supabase
    .from("design_ticket_deliverables")
    .select("*")
    .eq("id", deliverableId)
    .eq("ticket_id", id)
    .maybeSingle();

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: ticket } = await supabase
    .from("design_tickets")
    .select("ref, title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("design_ticket_deliverables")
    .delete()
    .eq("id", deliverableId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Row first, then the underlying storage: if this throws we've lost a file
  // but kept no dangling reference, which is the recoverable direction of the two.
  await deleteDeliverableStorage(supabase, file);

  await recordAudit({
    action: "delete",
    section: "design",
    entity: "design deliverable",
    entityId: deliverableId,
    entityLabel: file.file_name,
    summary: `Removed “${file.file_name}” from the design ticket ${ticket ? ticketRef(ticket.ref) : id}`,
    before: file,
  });

  return NextResponse.json({ success: true });
}
