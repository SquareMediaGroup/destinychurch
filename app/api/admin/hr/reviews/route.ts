import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { fullName } from "@/lib/hr";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id");

  const supabase = createServiceClient();
  let query = supabase
    .from("hr_reviews")
    .select("*, hr_staff(first_name, last_name)")
    .order("review_date", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.staff_id || !body.review_date) {
    return NextResponse.json(
      { error: "staff_id and review_date are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_reviews")
    .insert({
      staff_id: body.staff_id,
      review_date: body.review_date,
      type: body.type || "one_to_one",
      reviewer: body.reviewer?.trim() || null,
      summary: body.summary?.trim() || null,
      next_review_date: body.next_review_date || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const staff = await readForAudit("hr_staff", body.staff_id, "first_name, last_name");
  const who = staff
    ? fullName(staff as { first_name: string; last_name: string })
    : "a staff member";

  await recordAudit({
    action: "create",
    section: "hr",
    entity: "review",
    entityId: data.id,
    entityLabel: who,
    summary: `Logged a ${data.type.replace(/_/g, " ")} for ${who} on ${data.review_date}`,
    after: data,
    // What was said in a one-to-one stays in the HR record.
    redactFields: ["summary"],
  });

  return NextResponse.json(data, { status: 201 });
}
