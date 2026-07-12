import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

const ALPHA_TYPES = new Set([
  "alpha",
  "youth_alpha",
  "recovery",
  "bible_course",
]);
const ALPHA_TYPES_SQL = "(alpha,youth_alpha,recovery,bible_course)";

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
  const isAlphaType = ALPHA_TYPES.has(resolvedType);

  const supabase = createServiceClient();

  // Alpha rows are keyed by their type (alpha vs youth_alpha) so both can co-exist.
  // Non-alpha rows share a single row across types (announcement/notice/sitewide).
  const existingQuery = supabase.from("site_banner").select("id").limit(1);
  const { data: existing } = isAlphaType
    ? await existingQuery.eq("type", resolvedType).maybeSingle()
    : await existingQuery.not("type", "in", ALPHA_TYPES_SQL).maybeSingle();

  let error;
  if (existing?.id) {
    ({ error } = await supabase
      .from("site_banner")
      .update({
        active,
        message,
        type: resolvedType,
        link: link || null,
        link_text: link_text || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("site_banner").insert({
      active,
      message,
      type: resolvedType,
      link: link || null,
      link_text: link_text || null,
    }));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
