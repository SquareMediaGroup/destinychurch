import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getTemporaryDisplayUrl } from "@/lib/playbook.server";
import { getTicketByToken } from "@/lib/designTickets.server";

// The requester's download. The ownership check is the whole point of this
// route: without the ticket_id match, a valid token for ticket A would download
// any deliverable id in the system, and a uuid feels unguessable enough that
// the check is exactly the kind of thing that gets left out.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; deliverableId: string }> },
) {
  const { token, deliverableId } = await params;
  const supabase = createServiceClient();

  const ticket = await getTicketByToken(supabase, token);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: file } = await supabase
    .from("design_ticket_deliverables")
    .select("playbook_asset_token")
    .eq("id", deliverableId)
    .eq("ticket_id", ticket.id)
    .maybeSingle();

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await getTemporaryDisplayUrl(file.playbook_asset_token);
  if (!url) {
    return NextResponse.json({ error: "That file is no longer available" }, { status: 404 });
  }

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
