import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { currentEditorName } from "@/lib/posts-admin.server";
import { parsePageSettings } from "@/lib/posts-fields";

/** Templates admins have saved, newest first. The built-in ones live in code. */
export async function GET() {
  const { data, error } = await createServiceClient()
    .from("post_templates")
    .select("id, label, description, fields, created_by, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * Save a post's content and page settings as a template. The URL, schedule,
 * publish state and tags are left out: those belong to one page, not a layout.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";
  if (!label) return NextResponse.json({ error: "Give the template a name." }, { status: 400 });
  const description =
    typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 200) : null;

  const source = (body.fields ?? {}) as Record<string, unknown>;
  const settings = parsePageSettings({
    hero_style: source.hero_style,
    hero_image_url: source.hero_image_url,
    subtitle: source.subtitle,
    description: source.description,
    og_image_url: source.og_image_url,
    show_rails: source.show_rails,
  });
  if (!settings.ok) return NextResponse.json({ error: settings.error }, { status: 400 });
  const fields = {
    ...settings.fields,
    body: typeof source.body === "string" ? source.body : "",
  };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("post_templates")
    .insert({ label, description, fields, created_by: await currentEditorName(supabase) })
    .select("id, label, description, fields, created_by, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "posts",
    entity: "post template",
    entityId: data.id,
    entityLabel: data.label,
    summary: `Saved the post template “${data.label}”`,
    after: { label: data.label, description: data.description },
  });
  return NextResponse.json(data, { status: 201 });
}
