import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { formatDate, fullName } from "@/lib/hr";
import { humanise } from "@/lib/audit";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id");
  const mine = searchParams.get("mine") === "1";

  const supabase = createServiceClient();
  let query = supabase
    .from("hr_reviews")
    .select("*, hr_staff(first_name, last_name)")
    .order("review_date", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);

  if (mine) {
    const h = await headers();
    const actorId = h.get(AUDIT_ACTOR_HEADERS.id);
    // No actor on the request (outside admin middleware, or signed out) —
    // "my reviews" for nobody is an empty list, not everyone's reviews.
    if (!actorId) return NextResponse.json([]);
    query = query.eq("reviewer_auth_user_id", actorId);
  }

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
      reviewer_auth_user_id: body.reviewer_auth_user_id || null,
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
    summary: `Logged a ${humanise(data.type).toLowerCase()} for ${who} on ${formatDate(data.review_date)}`,
    after: data,
    // What was said in a one-to-one stays in the HR record.
    redactFields: ["summary"],
  });

  return NextResponse.json(data, { status: 201 });
}
