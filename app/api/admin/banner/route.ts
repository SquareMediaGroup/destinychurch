import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("site_banner")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { active: false, message: "", link: null, link_text: null });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { active, message, link, link_text } = body;

  const supabase = createServiceClient();

  // Check if a row exists
  const { data: existing } = await supabase
    .from("site_banner")
    .select("id")
    .limit(1)
    .maybeSingle();

  let error;
  if (existing?.id) {
    ({ error } = await supabase
      .from("site_banner")
      .update({ active, message, link: link || null, link_text: link_text || null, updated_at: new Date().toISOString() })
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase
      .from("site_banner")
      .insert({ active, message, link: link || null, link_text: link_text || null }));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
