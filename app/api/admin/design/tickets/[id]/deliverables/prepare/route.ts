import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { prepareUpload } from "@/lib/playbook.server";
import { designBoardToken } from "@/lib/designTickets.server";
import { ticketRef } from "@/lib/designTickets";

// audit-exempt: hands back a signed upload destination and writes nothing to
// the database; the matching complete route records the upload once the asset
// actually exists, so auditing here would log intentions rather than facts.

// Step 1 of the deliverable upload. The bytes never come through here — the
// browser PUTs them straight to Playbook's storage using the destination this
// returns (lib/directUpload.ts), which is what lets a designer hand over a
// 300MB print-ready PDF without meeting Vercel's 100MB request-body cap.
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

// Deliberately permissive about design formats and deliberately closed about
// anything executable. A designer hands over PDFs, layered source files and
// archives; nothing here should ever accept something a browser would run.
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/tiff",
  "application/pdf",
  "application/postscript", // .ai, .eps
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const fileName = typeof body.file_name === "string" ? body.file_name.slice(0, 255) : "";
  const mediaType = typeof body.media_type === "string" ? body.media_type : "";
  const size = Number(body.size);

  if (!fileName) return NextResponse.json({ error: "Missing file name" }, { status: 400 });
  if (!ALLOWED.has(mediaType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Missing file size" }, { status: 400 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 2GB" }, { status: 413 });
  }

  const supabase = createServiceClient();
  const { data: ticket } = await supabase
    .from("design_tickets")
    .select("id, ref, revision, playbook_board_token")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const boardToken = await designBoardToken(supabase, ticket);

  // Every asset shares one board, so the title is what makes it findable by a
  // human poking around the DAM: "DT-0007 r2 — poster-final.pdf".
  const title = `${ticketRef(ticket.ref)} r${ticket.revision} — ${fileName}`;

  try {
    const prepared = await prepareUpload({ title, mediaType, size, boardToken });
    return NextResponse.json({
      storageProvider: prepared.storage_provider,
      uploadUrl: prepared.upload_url,
      signedGcsId: prepared.signed_gcs_id,
      fileExtension: prepared.file_extension,
      encryptedOrganizationMetadata: prepared.encrypted_organization_metadata,
      multipartUploadId: prepared.multipart_upload_id,
      partSize: prepared.part_size,
      parts: prepared.parts,
    });
  } catch (err) {
    console.error("📤 Playbook upload_prepare failed:", err);
    return NextResponse.json(
      { error: "Couldn't start the upload. Try again in a moment." },
      { status: 502 },
    );
  }
}
