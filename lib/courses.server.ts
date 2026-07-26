// Server-only lookups for the courses registry (the data itself is in lib/courses.ts).
import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { isCourseId, type CourseId } from "@/lib/courses";

/**
 * The course currently featured in admin (/admin/featured-course → the
 * `featured_course` singleton row). Falls back to the Bible Course whenever the
 * row is missing or unreadable, so callers never have to handle an error case.
 */
export async function getFeaturedCourseId(): Promise<CourseId> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("featured_course")
      .select("course_id")
      .eq("id", 1)
      .maybeSingle();
    return isCourseId(data?.course_id) ? data.course_id : "bible_course";
  } catch {
    return "bible_course";
  }
}
