// Write the popup_* columns of the featured_event singleton.
//
// PARTIAL UPDATE ONLY. Two admin pages write to one row: /admin/featured-event
// owns the target + hero columns, this one owns popup_*. A full-row upsert from
// here would blank every hero override, so this uses `update ... eq(id, 1)`
// with a popup-only payload and never touches the other columns.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

const BUCKET = "popup-images";

function nullable(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export async function PUT(request: Request) {
  const body = await request.json();
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("featured_event")
    .select("id, active, popup_image_path")
    .eq("id", 1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "No featured event configured yet." },
      { status: 409 },
    );
  }

  // The featured_event_popup_needs_active constraint would reject this with a
  // raw Postgres message; catch it here so admin sees something actionable.
  if (Boolean(body.popup_active) && !existing.active) {
    return NextResponse.json(
      {
        error:
          "Turn on a featured event before enabling its popup — the popup advertises whichever event is featured.",
      },
      { status: 409 },
    );
  }

  const payload = {
    popup_active: Boolean(body.popup_active),
    popup_title: nullable(body.popup_title),
    popup_body: nullable(body.popup_body),
    popup_image_url: nullable(body.popup_image_url),
    popup_image_path: nullable(body.popup_image_path),
    popup_cta_text: nullable(body.popup_cta_text),
    popup_cta_link: nullable(body.popup_cta_link),
    // Bumped so the popup's sessionStorage key changes and edited copy
    // re-shows to visitors who already dismissed the previous version.
    updated_at: new Date().toISOString(),
  };

  if (
    existing.popup_image_path &&
    existing.popup_image_path !== payload.popup_image_path
  ) {
    await supabase.storage.from(BUCKET).remove([existing.popup_image_path]);
  }

  const { error } = await supabase
    .from("featured_event")
    .update(payload)
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // No revalidatePath: app/layout.tsx reads the popup with noStore(), so this
  // is live on the next request.
  return NextResponse.json({ ok: true });
}
