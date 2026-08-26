import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/service";
import { COURSES, isCourseId } from "@/lib/courses";
import { readForAudit, recordAudit } from "@/lib/audit.server";

// GET — the currently featured course on /whats-on.
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("featured_course")
    .select("course_id")
    .eq("id", 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course_id: data?.course_id ?? "bible_course" });
}

// PUT — swap which course is featured. The other three stay in the grid.
export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const courseId = body.course_id;

  if (!isCourseId(courseId)) {
    return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const before = await readForAudit("featured_course", 1);
  const { error } = await supabase.from("featured_course").upsert({
    id: 1,
    course_id: courseId,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update",
    section: "courses",
    entity: "featured course",
    entityId: 1,
    entityLabel: COURSES[courseId].name,
    summary: `Made “${COURSES[courseId].name}” the featured course on What's On`,
    changes: { course_id: { from: before?.course_id ?? null, to: courseId } },
  });

  revalidatePath("/whats-on");
  return NextResponse.json({ ok: true, course_id: courseId });
}
