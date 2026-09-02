import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { recordAudit } from "@/lib/audit.server";
import { completeUpload, deleteAsset } from "@/lib/playbook.server";
import { designBoardToken } from "@/lib/designTickets.server";
import { ticketRef } from "@/lib/designTickets";

// Step 2: the browser has finished PUTting the bytes, so turn the signed
// destination into a real Playbook asset and record it against the ticket.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const h = await headers();

  const signedGcsId = typeof body.signed_gcs_id === "string" ? body.signed_gcs_id : "";
  const fileName = typeof body.file_name === "string" ? body.file_name.slice(0, 255) : "";
  const mediaType = typeof body.media_type === "string" ? body.media_type : "";
  const size = Number(body.size);

  if (!signedGcsId || !fileName || !mediaType) {
    return NextResponse.json({ error: "Incomplete upload" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: ticket } = await supabase
    .from("design_tickets")
    .select("id, ref, title, revision, playbook_board_token")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const boardToken = await designBoardToken(supabase, ticket);
  const title = `${ticketRef(ticket.ref)} r${ticket.revision} — ${fileName}`;

  let asset;
  try {
    asset = await completeUpload({
      signedGcsId,
      multipartUploadId:
        typeof body.multipart_upload_id === "string" ? body.multipart_upload_id : undefined,
      title,
      mediaType,
      size: Number.isFinite(size) ? size : 0,
      boardToken,
    });
  } catch (err) {
    console.error("📤 Playbook upload_complete failed:", err);
    return NextResponse.json({ error: "Couldn't finish the upload." }, { status: 502 });
  }

  const { data, error } = await supabase
    .from("design_ticket_deliverables")
    .insert({
      ticket_id: id,
      // Stamped with the revision that is current *now*. This is what makes a
      // revision a filter rather than a mutation — round one's files stay
      // exactly where they were and stay downloadable.
      revision: ticket.revision,
      playbook_asset_token: asset.token,
      file_name: fileName,
      mime_type: mediaType,
      size_bytes: Number.isFinite(size) ? size : null,
      uploaded_by_email: h.get(AUDIT_ACTOR_HEADERS.email),
    })
    .select()
    .single();

  if (error) {
    // The asset exists in the DAM but nothing points at it. Remove it, or every
    // failed write leaves a file no one can find and no one will ever delete.
    try {
      await deleteAsset(asset.token);
    } catch (cleanupErr) {
      console.error(`🗑️ Orphaned Playbook asset ${asset.token}:`, cleanupErr);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("design_tickets")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", id);

  await recordAudit({
    action: "upload",
    section: "design",
    entity: "design deliverable",
    entityId: data.id,
    entityLabel: fileName,
    summary: `Uploaded “${fileName}” to the design ticket ${ticketRef(ticket.ref)} “${ticket.title}”`,
    after: { file_name: fileName, revision: ticket.revision, size_bytes: size },
  });

  return NextResponse.json(data, { status: 201 });
}
