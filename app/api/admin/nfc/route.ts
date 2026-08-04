// CRUD for the admin-managed tiles on /nfc.
//
// Auth comes free: middleware.ts matches /api/admin/:path*, so an unauthenticated
// caller never reaches this file. Reads and writes use the service client, per the
// repo's deny-all-plus-service-role RLS convention.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { isEmbeddable } from "@/lib/nfcTiles";

const BUCKET = "popup-images";

interface TilePayload {
  active: boolean;
  sort_order: number;
  title: string;
  subtitle: string | null;
  icon: string;
  mode: "embed" | "info";
  embed_url: string | null;
  embed_size: "md" | "lg";
  body: string | null;
  image_url: string | null;
  image_path: string | null;
  cta_text: string | null;
  cta_link: string | null;
}

/** A CTA may point at a page on this site or an absolute https URL, nothing else. */
function validCtaLink(link: string): boolean {
  return link.startsWith("/") || /^https:\/\//i.test(link);
}

/**
 * Normalise and validate a request body. Returns either the row to write or the
 * message to hand back — the DB has its own check constraints, but failing here
 * gives the admin a sentence instead of a Postgres error string.
 */
function buildPayload(
  input: Record<string, unknown>
): { payload: TilePayload } | { error: string } {
  const title = String(input.title ?? "").trim();
  if (!title) return { error: "Title is required" };
  if (title.length > 60) return { error: "Title must be 60 characters or fewer" };

  const subtitle = String(input.subtitle ?? "").trim();
  if (subtitle.length > 90)
    return { error: "Subtitle must be 90 characters or fewer" };

  const body = String(input.body ?? "").trim();
  if (body.length > 600) return { error: "Body must be 600 characters or fewer" };

  const mode = input.mode === "embed" ? "embed" : "info";
  const embedUrl = String(input.embed_url ?? "").trim();

  if (mode === "embed") {
    if (!embedUrl) return { error: "An embed URL is required for form tiles" };
    if (!isEmbeddable(embedUrl))
      return {
        error:
          "Only churchsuite.com URLs can be embedded — anything else refuses to be framed. Use a details tile with a link instead.",
      };
  }

  const ctaLink = String(input.cta_link ?? "").trim();
  if (ctaLink && !validCtaLink(ctaLink))
    return { error: "Link must start with / or https://" };

  if (mode === "info" && !ctaLink && !body)
    return { error: "A details tile needs a description, a link, or both" };

  const sortOrder = Number(input.sort_order);

  return {
    payload: {
      active: input.active !== false,
      sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
      title,
      subtitle: subtitle || null,
      icon: String(input.icon ?? "").trim() || "star",
      mode,
      embed_url: mode === "embed" ? embedUrl : null,
      embed_size: input.embed_size === "lg" ? "lg" : "md",
      body: body || null,
      image_url: String(input.image_url ?? "").trim() || null,
      image_path: String(input.image_path ?? "").trim() || null,
      cta_text: String(input.cta_text ?? "").trim() || null,
      cta_link: ctaLink || null,
    },
  };
}

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("nfc_tiles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const input = await request.json();
  const built = buildPayload(input);
  if ("error" in built)
    return NextResponse.json({ error: built.error }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("nfc_tiles")
    .insert(built.payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const input = await request.json();
  const id = String(input.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const built = buildPayload(input);
  if ("error" in built)
    return NextResponse.json({ error: built.error }, { status: 400 });

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("nfc_tiles")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (!existing)
    return NextResponse.json({ error: "Tile not found" }, { status: 404 });

  const { error } = await supabase
    .from("nfc_tiles")
    .update({ ...built.payload, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only after the row is safely updated: drop the image the row no longer
  // points at, so a failed write can't orphan the live artwork.
  if (existing.image_path && existing.image_path !== built.payload.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("nfc_tiles")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("nfc_tiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path]);
  }

  return NextResponse.json({ ok: true });
}
