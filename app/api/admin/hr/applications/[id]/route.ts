import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { humanise } from "@/lib/audit";
import { readForAudit, recordAudit } from "@/lib/audit.server";

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
  const before = await readForAudit("job_applications", id, "status");
  const { data, error } = await supabase
    .from("job_applications")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The applicant's name is the label; nothing else off their form is copied
  // into the log.
  const who = [data.first_name, data.last_name].filter(Boolean).join(" ") || "an applicant";
  await recordAudit({
    action: body.status === "hired" ? "approve" : body.status === "rejected" ? "reject" : "update",
    section: "hr",
    entity: "job application",
    entityId: id,
    entityLabel: who,
    summary: `Moved ${who}'s application to “${humanise(body.status)}”`,
    changes: { status: { from: before?.status ?? null, to: body.status } },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Remove the stored CV first so storage doesn't drift from the table.
  const row = await readForAudit("job_applications", id, "cv_path, first_name, last_name, status");
  if (row?.cv_path) {
    await supabase.storage.from(BUCKET).remove([row.cv_path as string]);
  }

  const { error } = await supabase.from("job_applications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const who = row
    ? [row.first_name, row.last_name].filter(Boolean).join(" ") || "an applicant"
    : "an applicant";
  await recordAudit({
    action: "delete",
    section: "hr",
    entity: "job application",
    entityId: id,
    entityLabel: who,
    summary: `Deleted ${who}'s application${row?.cv_path ? " and their uploaded CV" : ""}`,
    changes: null,
    metadata: { cv_deleted: Boolean(row?.cv_path) },
  });

  return NextResponse.json({ success: true });
}
