// Read/write the featured_event singleton (target + hero overrides).
//
// The popup columns on the same row are owned by
// /api/admin/featured-event/popup — this route must never write them, and that
// one must never write these. See the note on PUT below.
//
// Auth comes from middleware.ts (`/api/admin/:path*`), matching every other
// admin route: no per-handler check, service client throughout.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

const BUCKET = "popup-images";

/** Shape returned when the row has never been written. */
const EMPTY = {
  event_identifier: null,
  event_sequence: null,
  event_id: null,
  event_name: null,
  event_slug: null,
  event_ends_at: null,
  active: false,
  promote_from: null,
  promote_until: null,
  headline: "",
  blurb: "",
  image_url: null,
  image_path: null,
  cta_text: "",
  cta_link: "",
  popup_active: false,
};

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("featured_event")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? EMPTY);
}

function nullable(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function timestamp(value: unknown): string | null {
  const text = nullable(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function PUT(request: Request) {
  const body = await request.json();
  const supabase = createServiceClient();

  const existing = await readForAudit("featured_event", 1);

  // Only the target + hero columns. Deliberately omits every popup_* column so
  // saving here cannot blank copy written on the event-popup page.
  const payload = {
    id: 1,
    event_identifier: nullable(body.event_identifier),
    event_sequence:
      typeof body.event_sequence === "number" ? body.event_sequence : null,
    event_id: typeof body.event_id === "number" ? body.event_id : null,
    event_name: nullable(body.event_name),
    event_slug: nullable(body.event_slug),
    event_ends_at: timestamp(body.event_ends_at),
    active: Boolean(body.active),
    promote_from: timestamp(body.promote_from),
    promote_until: timestamp(body.promote_until),
    headline: nullable(body.headline),
    blurb: nullable(body.blurb),
    image_url: nullable(body.image_url),
    image_path: nullable(body.image_path),
    cta_text: nullable(body.cta_text),
    cta_link: nullable(body.cta_link),
    updated_at: new Date().toISOString(),
  };

  // Drop the superseded file so replaced artwork doesn't accumulate in the
  // bucket — same behaviour as the site-popup route.
  if (existing?.image_path && existing.image_path !== payload.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path as string]);
  }

  const { error } = await supabase
    .from("featured_event")
    .upsert(payload, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The layout reads the popup with noStore(), but the /whats-on hero and the
  // homepage carousel are cached routes — they need explicit invalidation.
  revalidatePath("/whats-on");
  revalidatePath("/");

  const name = payload.event_name ?? "(no event)";
  const wasActive = Boolean(existing?.active);
  const verb = payload.active && !wasActive
    ? "Started promoting"
    : !payload.active && wasActive
      ? "Stopped promoting"
      : "Edited the promotion for";

  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "featured event",
    entityId: 1,
    entityLabel: name,
    summary: `${verb} the featured event “${name}”`,
    before: existing,
    after: payload,
  });

  return NextResponse.json({ ok: true });
}
