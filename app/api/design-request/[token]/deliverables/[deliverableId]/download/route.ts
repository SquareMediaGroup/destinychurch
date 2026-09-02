import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getTemporaryDisplayUrl } from "@/lib/playbook.server";
import { DESIGN_DELIVERABLES_BUCKET, getTicketByToken } from "@/lib/designTickets.server";

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
    .select("storage_kind, playbook_asset_token, file_path, link_url")
    .eq("id", deliverableId)
    .eq("ticket_id", ticket.id)
    .maybeSingle();

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let url: string | null = null;
  if (file.storage_kind === "supabase" && file.file_path) {
    const { data } = await supabase.storage
      .from(DESIGN_DELIVERABLES_BUCKET)
      .createSignedUrl(file.file_path, 60);
    url = data?.signedUrl ?? null;
  } else if (file.storage_kind === "link" && file.link_url) {
    url = file.link_url;
  } else if (file.storage_kind === "playbook" && file.playbook_asset_token) {
    url = await getTemporaryDisplayUrl(file.playbook_asset_token);
  }

  if (!url) {
    return NextResponse.json({ error: "That file is no longer available" }, { status: 404 });
  }

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
