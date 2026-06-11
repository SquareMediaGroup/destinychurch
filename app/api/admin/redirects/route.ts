import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireUser } from "@/lib/apiAuth";

export async function GET() {
  const denied = await requireUser();
  if (denied) return denied;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("redirects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const denied = await requireUser();
  if (denied) return denied;

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
  return NextResponse.json(data, { status: 201 });
}
