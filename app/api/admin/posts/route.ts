import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkSlug } from "@/lib/posts-slug";
import { recordAudit } from "@/lib/audit.server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "A post title is required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await checkSlug(supabase, body.slug ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title,
      slug: result.slug,
      body: body.body?.trim() || null,
      is_published: body.is_published ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "posts",
    entity: "post",
    entityId: data.id,
    entityLabel: data.title,
    summary: `Created the post “${data.title}” at /${data.slug}${
      data.is_published ? "" : " (draft)"
    }`,
    after: data,
  });

  return NextResponse.json(data, { status: 201 });
}
