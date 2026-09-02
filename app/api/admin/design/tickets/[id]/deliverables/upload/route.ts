import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { recordAudit } from "@/lib/audit.server";
import { DESIGN_DELIVERABLES_BUCKET } from "@/lib/designTickets.server";
import { ticketRef } from "@/lib/designTickets";

// Images and PDFs go straight into Supabase Storage — one request, no
// prepare/complete dance. That's only possible because this tier is capped at
// 50MB; anything bigger (or video) doesn't belong here at all.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024; // 50MB — matches the bucket's file_size_limit

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const h = await headers();
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, GIF, SVG or PDF files are accepted here" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 50MB" }, { status: 413 });
  }

  const supabase = createServiceClient();
  const { data: ticket } = await supabase
    .from("design_tickets")
    .select("id, ref, revision")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DESIGN_DELIVERABLES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("design_ticket_deliverables")
    .insert({
      ticket_id: id,
      revision: ticket.revision,
      storage_kind: "supabase",
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by_email: h.get(AUDIT_ACTOR_HEADERS.email),
    })
    .select()
    .single();

  if (error) {
    // The bytes exist but nothing points at them. Remove them, or every
    // failed write leaves an orphaned file no one can find or delete.
    await supabase.storage.from(DESIGN_DELIVERABLES_BUCKET).remove([path]);
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
    entityLabel: file.name,
    summary: `Uploaded “${file.name}” to the design ticket ${ticketRef(ticket.ref)}`,
    after: { file_name: file.name, revision: ticket.revision, size_bytes: file.size },
  });

  return NextResponse.json(data, { status: 201 });
}
