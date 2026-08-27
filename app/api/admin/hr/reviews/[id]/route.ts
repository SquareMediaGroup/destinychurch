import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { formatDate, fullName } from "@/lib/hr";
import { humanise } from "@/lib/audit";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const key of [
    "review_date",
    "type",
    "reviewer",
    "summary",
    "next_review_date",
  ]) {
    if (key in body) update[key] = body[key];
  }

  const supabase = createServiceClient();
  const before = await readForAudit("hr_reviews", id);
  const { data, error } = await supabase
    .from("hr_reviews")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const staff = await readForAudit("hr_staff", data.staff_id, "first_name, last_name");
  const who = staff
    ? fullName(staff as { first_name: string; last_name: string })
    : "a staff member";

  await recordAudit({
    action: "update",
    section: "hr",
    entity: "review",
    entityId: id,
    entityLabel: who,
    summary: `Edited the ${humanise(data.type).toLowerCase()} record for ${who} on ${formatDate(data.review_date)}`,
    before,
    after: update,
    redactFields: ["summary"],
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("hr_reviews", id);
  const staff = before?.staff_id
    ? await readForAudit("hr_staff", before.staff_id as string, "first_name, last_name")
    : null;
  const { error } = await supabase.from("hr_reviews").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const who = staff
    ? fullName(staff as { first_name: string; last_name: string })
    : "a staff member";
  await recordAudit({
    action: "delete",
    section: "hr",
    entity: "review",
    entityId: id,
    entityLabel: who,
    summary: `Deleted the review record for ${who}${before ? ` on ${before.review_date}` : ""}`,
    before,
    redactFields: ["summary"],
  });

  return NextResponse.json({ success: true });
}
