import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("site_popup")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    data ?? {
      active: false,
      title: "",
      body: "",
      cta_text: "",
      cta_link: "",
      image_url: null,
      image_path: null,
      show_once: true,
    }
  );
}

export async function PUT(request: Request) {
  const body = await request.json();
  const {
    active,
    title,
    body: text,
    cta_text,
    cta_link,
    image_url,
    image_path,
    show_once,
  } = body;

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("site_popup")
    .select("id, image_path")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payload = {
    active: !!active,
    title: title || null,
    body: text || null,
    cta_text: cta_text || null,
    cta_link: cta_link || null,
    image_url: image_url || null,
    image_path: image_path || null,
    show_once: show_once !== false,
    updated_at: new Date().toISOString(),
  };

  // Read the current row before it is overwritten — the audit entry needs the
  // "from" side of the diff.
  const before = existing?.id ? await readForAudit("site_popup", existing.id) : null;

  let error;
  if (existing?.id) {
    // If image was replaced, delete the old file from storage.
    if (
      existing.image_path &&
      existing.image_path !== payload.image_path
    ) {
      await supabase.storage
        .from("popup-images")
        .remove([existing.image_path]);
    }
    ({ error } = await supabase
      .from("site_popup")
      .update(payload)
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("site_popup").insert(payload));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const wasActive = Boolean(before?.active);
  const verb = payload.active && !wasActive
    ? "Switched on"
    : !payload.active && wasActive
      ? "Switched off"
      : "Edited";

  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "site popup",
    entityId: existing?.id ?? null,
    entityLabel: payload.title || "Site popup",
    summary: `${verb} the first-visit popup “${payload.title || "(untitled)"}”`,
    before,
    after: payload,
  });

  return NextResponse.json({ ok: true });
}
