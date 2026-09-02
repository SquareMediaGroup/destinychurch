import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getTemporaryDisplayUrl } from "@/lib/playbook.server";
import { DESIGN_DELIVERABLES_BUCKET } from "@/lib/designTickets.server";

// A fresh signed URL per click, handed straight to the browser as a redirect.
// Never cached and never stored — a Playbook display URL expires in about a
// day and a Supabase one in a minute, so a cached link is a download button
// that works until it silently doesn't. A "link" deliverable owns no bytes of
// ours at all, so that kind just redirects straight to wherever it points.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; deliverableId: string }> },
) {
  const { id, deliverableId } = await params;
  const supabase = createServiceClient();

  const { data: file } = await supabase
    .from("design_ticket_deliverables")
    .select("storage_kind, playbook_asset_token, file_path, link_url")
    .eq("id", deliverableId)
    .eq("ticket_id", id)
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
