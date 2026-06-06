import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

const BUCKET = "job-applications";

// GET → application detail plus a short-lived signed URL for the CV (if any).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  let cv_url: string | null = null;
  if (data.cv_path) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.cv_path, 60 * 10);
    cv_url = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ ...data, cv_url });
}

const VALID_STATUS = ["new", "reviewing", "shortlisted", "rejected", "hired"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("job_applications")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Remove the stored CV first so storage doesn't drift from the table.
  const { data: row } = await supabase
    .from("job_applications")
    .select("cv_path")
    .eq("id", id)
    .single();
  if (row?.cv_path) {
    await supabase.storage.from(BUCKET).remove([row.cv_path]);
  }

  const { error } = await supabase.from("job_applications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
