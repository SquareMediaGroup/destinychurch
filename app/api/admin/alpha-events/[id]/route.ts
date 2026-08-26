import { createClient } from "@supabase/supabase-js";
import { COURSE_EVENT_META, isCourseEventType } from "@/lib/courseEvents";
import { readForAudit, recordAudit } from "@/lib/audit.server";

function courseLabel(type: unknown): string {
  return isCourseEventType(type) ? COURSE_EVENT_META[type].label : String(type ?? "course");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id } = await params;
    const before = await readForAudit("alpha_events", id);

    const { data, error } = await supabase
      .from("alpha_events")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // The list page toggles `active` inline, so say which way it went — that is
    // the difference between a date being live on the site and not.
    const toggledOnly = Object.keys(body).length === 1 && "active" in body;
    const label = `${courseLabel(data.type)} — ${data.start_date}`;

    await recordAudit({
      action: "update",
      section: "courses",
      entity: "course date",
      entityId: id,
      entityLabel: label,
      summary: toggledOnly
        ? `${data.active ? "Showed" : "Hid"} the ${courseLabel(data.type)} date starting ${data.start_date}`
        : `Edited the ${courseLabel(data.type)} date starting ${data.start_date}`,
      before,
      after: data,
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const before = await readForAudit("alpha_events", id);

    const { error } = await supabase
      .from("alpha_events")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await recordAudit({
      action: "delete",
      section: "courses",
      entity: "course date",
      entityId: id,
      entityLabel: before ? `${courseLabel(before.type)} — ${before.start_date}` : null,
      summary: before
        ? `Deleted the ${courseLabel(before.type)} date starting ${before.start_date}`
        : `Deleted a course date (${id})`,
      before,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete event" },
      { status: 500 }
    );
  }
}
