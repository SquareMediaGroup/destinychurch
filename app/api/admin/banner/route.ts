import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  COURSE_EVENT_TYPES_SQL as ALPHA_TYPES_SQL,
  isCourseEventType,
} from "@/lib/courseEvents";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const supabase = createServiceClient();

  if (type) {
    const { data, error } = await supabase
      .from("site_banner")
      .select("*")
      .eq("type", type)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      data ?? {
        active: false,
        message: "",
        type,
        link: null,
        link_text: null,
      }
    );
  }

  // Default: prefer non-alpha row (the main banner control surface).
  const { data: nonAlpha, error: nonAlphaErr } = await supabase
    .from("site_banner")
    .select("*")
    .not("type", "in", ALPHA_TYPES_SQL)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nonAlphaErr)
    return NextResponse.json({ error: nonAlphaErr.message }, { status: 500 });
  if (nonAlpha) return NextResponse.json(nonAlpha);

  // Fall back to whatever first row exists (covers older single-row deployments).
  const { data, error } = await supabase
    .from("site_banner")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    data ?? {
      active: false,
      message: "",
      type: "announcement",
      link: null,
      link_text: null,
    }
  );
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { active, message, type, link, link_text } = body;
  const resolvedType = type ?? "announcement";
  const isAlphaType = isCourseEventType(resolvedType);

  const supabase = createServiceClient();

  // Alpha rows are keyed by their type (alpha vs youth_alpha) so both can co-exist.
  // Non-alpha rows share a single row across types (announcement/notice/sitewide).
  const existingQuery = supabase.from("site_banner").select("id").limit(1);
  const { data: existing } = isAlphaType
    ? await existingQuery.eq("type", resolvedType).maybeSingle()
    : await existingQuery.not("type", "in", ALPHA_TYPES_SQL).maybeSingle();

  const next = {
    active,
    message,
    type: resolvedType,
    link: link || null,
    link_text: link_text || null,
  };

  let error;
  const before = existing?.id ? await readForAudit("site_banner", existing.id) : null;
  if (existing?.id) {
    ({ error } = await supabase
      .from("site_banner")
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("site_banner").insert(next));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The banner sits across the top of every page on the site, so "who turned
  // that on" is one of the questions this log gets asked most. Say whether it
  // went up or came down in the sentence itself rather than leaving it to the
  // field diff.
  const wasActive = Boolean(before?.active);
  const verb = active && !wasActive
    ? "Switched on"
    : !active && wasActive
      ? "Switched off"
      : active
        ? "Edited the live"
        : "Edited the (hidden)";

  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "site banner",
    entityId: existing?.id ?? null,
    entityLabel: message || resolvedType,
    summary: `${verb} ${resolvedType} banner: “${message || "(no message)"}”`,
    before,
    after: next,
  });

  return NextResponse.json({ ok: true });
}
