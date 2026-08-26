import { createClient } from "@supabase/supabase-js";
import { COURSE_EVENT_META, isCourseEventType } from "@/lib/courseEvents";
import { recordAudit } from "@/lib/audit.server";

/** "Alpha" rather than "youth_alpha" in the log sentence. */
function courseLabel(type: unknown): string {
  return isCourseEventType(type) ? COURSE_EVENT_META[type].label : String(type ?? "course");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("alpha_events")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) throw error;
    return Response.json(data || []);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const {
      type,
      start_date,
      signup_url,
      location,
      format,
      meeting_platform,
      meeting_url,
      meeting_id,
      meeting_passcode,
      frequency,
      custom_interval_days,
      active,
    } = await req.json();

    if (!type || !start_date || !signup_url) {
      return Response.json(
        { error: "Missing required fields: type, start_date, signup_url" },
        { status: 400 }
      );
    }

    const eventFormat = format === "online" ? "online" : "in_person";
    const allowedFreq = ["weekly", "fortnightly", "monthly", "custom", "one_off"];
    const eventFrequency = allowedFreq.includes(frequency) ? frequency : "weekly";
    const parsedInterval =
      eventFrequency === "custom" && Number.isFinite(Number(custom_interval_days))
        ? Math.max(1, Math.floor(Number(custom_interval_days)))
        : null;

    const { data, error } = await supabase
      .from("alpha_events")
      .insert({
        type,
        start_date,
        signup_url,
        format: eventFormat,
        location: eventFormat === "in_person" ? location || null : null,
        meeting_platform:
          eventFormat === "online" ? meeting_platform || null : null,
        meeting_url: eventFormat === "online" ? meeting_url || null : null,
        meeting_id: eventFormat === "online" ? meeting_id || null : null,
        meeting_passcode:
          eventFormat === "online" ? meeting_passcode || null : null,
        frequency: eventFrequency,
        custom_interval_days: parsedInterval,
        active: active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    await recordAudit({
      action: "create",
      section: "courses",
      entity: "course date",
      entityId: data.id,
      entityLabel: `${courseLabel(data.type)} — ${data.start_date}`,
      summary: `Added a ${courseLabel(data.type)} date starting ${data.start_date} (${data.frequency}, ${data.format === "online" ? "online" : data.location || "in person"})`,
      after: data,
    });

    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
