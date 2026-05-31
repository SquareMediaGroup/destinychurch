import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

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

  const { data: doc } = await supabase
    .from("hr_documents")
    .select("file_path")
    .eq("id", id)
    .single();

  if (doc?.file_path) {
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
  }

  const { error } = await supabase.from("hr_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
