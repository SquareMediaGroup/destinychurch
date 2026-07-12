import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/service";
import { isCourseId } from "@/lib/courses";

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
  const { error } = await supabase.from("featured_course").upsert({
    id: 1,
    course_id: courseId,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/whats-on");
  return NextResponse.json({ ok: true, course_id: courseId });
}
