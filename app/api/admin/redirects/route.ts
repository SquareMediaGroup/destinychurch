import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("redirects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { slug, target_url, label } = await request.json();

  if (!slug || !target_url) {
    return NextResponse.json({ error: "slug and target_url are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("redirects")
    .insert({ slug: slug.trim().toLowerCase(), target_url: target_url.trim(), label })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "site",
    entity: "redirect",
    entityId: data.id,
    entityLabel: `/${data.slug}`,
    summary: `Created the redirect /${data.slug} → ${data.target_url}`,
    after: data,
  });

  return NextResponse.json(data, { status: 201 });
}
