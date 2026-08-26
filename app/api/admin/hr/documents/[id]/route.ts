import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

const BUCKET = "hr-documents";

// Mint a short-lived signed URL for a private document.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: doc, error: docError } = await supabase
    .from("hr_documents")
    .select("file_path")
    .eq("id", id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const doc = await readForAudit("hr_documents", id, "file_path, title, category, staff_id");

  if (doc?.file_path) {
    await supabase.storage.from(BUCKET).remove([doc.file_path as string]);
  }

  const { error } = await supabase.from("hr_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "hr",
    entity: "HR document",
    entityId: id,
    entityLabel: (doc?.title as string) ?? null,
    summary: `Deleted the HR document “${doc?.title ?? id}”`,
    changes: null,
    metadata: { category: doc?.category ?? null, staff_id: doc?.staff_id ?? null },
  });

  return NextResponse.json({ success: true });
}
