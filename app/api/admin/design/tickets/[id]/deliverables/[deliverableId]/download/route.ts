import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getTemporaryDisplayUrl } from "@/lib/playbook.server";

// A fresh signed URL per click, handed straight to the browser as a redirect.
// Never cached and never stored: a Playbook display URL expires in about a day,
// so a cached one is a download button that works until it silently doesn't.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; deliverableId: string }> },
) {
  const { id, deliverableId } = await params;
  const supabase = createServiceClient();

  const { data: file } = await supabase
    .from("design_ticket_deliverables")
    .select("playbook_asset_token")
    .eq("id", deliverableId)
    .eq("ticket_id", id)
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
