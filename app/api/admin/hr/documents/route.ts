import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

const BUCKET = "hr-documents";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id");
  const scope = searchParams.get("scope"); // "org" → org-wide only (staff_id is null)

  const supabase = createServiceClient();
  let query = supabase
    .from("hr_documents")
    .select("*, hr_staff(first_name, last_name)")
    .order("created_at", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);
  else if (scope === "org") query = query.is("staff_id", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Upload a file (multipart/form-data) → storage + metadata row.
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const title = form.get("title")?.toString().trim();
  const category = form.get("category")?.toString() || "other";
  const staffId = form.get("staff_id")?.toString() || null;
  const uploadedBy = form.get("uploaded_by")?.toString() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "A title is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${staffId ?? "org"}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("hr_documents")
    .insert({
      staff_id: staffId,
      title,
      category,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error) {
    // Roll back the orphaned upload so storage doesn't drift from metadata.
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
