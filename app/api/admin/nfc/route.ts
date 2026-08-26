// CRUD for the admin-managed tiles on /nfc.
//
// Auth comes free: middleware.ts matches /api/admin/:path*, so an unauthenticated
// caller never reaches this file. Reads and writes use the service client, per the
// repo's deny-all-plus-service-role RLS convention.

import { NextResponse } from "next/server";
import { eventSignupUrl, parseFeedDate } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { getEventIndex } from "@/lib/events.server";
import { SIGNUP_ANCHOR, isEmbeddable, type NfcTileMode } from "@/lib/nfcTiles";
import { readForAudit, recordAudit } from "@/lib/audit.server";

const BUCKET = "popup-images";

interface TilePayload {
  active: boolean;
  sort_order: number;
  title: string;
  subtitle: string | null;
  icon: string;
  mode: NfcTileMode;
  embed_url: string | null;
  embed_size: "md" | "lg";
  body: string | null;
  image_url: string | null;
  image_path: string | null;
  cta_text: string | null;
  cta_link: string | null;
  event_identifier: string | null;
  event_sequence: number | null;
  event_slug: string | null;
  event_name: string | null;
  event_ends_at: string | null;
}

/** The event columns an embed/info tile writes — always cleared, never stale. */
const NO_EVENT = {
  event_identifier: null,
  event_sequence: null,
  event_slug: null,
  event_name: null,
  event_ends_at: null,
} as const;

/** A CTA may point at a page on this site or an absolute https URL, nothing else. */
function validCtaLink(link: string): boolean {
  return link.startsWith("/") || /^https:\/\//i.test(link);
}

/**
 * Normalise and validate a request body. Returns either the row to write or the
 * message to hand back — the DB has its own check constraints, but failing here
 * gives the admin a sentence instead of a Postgres error string.
 */
async function buildPayload(
  input: Record<string, unknown>
): Promise<{ payload: TilePayload } | { error: string }> {
  const title = String(input.title ?? "").trim();
  if (!title) return { error: "Title is required" };
  if (title.length > 60) return { error: "Title must be 60 characters or fewer" };

  const subtitle = String(input.subtitle ?? "").trim();
  if (subtitle.length > 90)
    return { error: "Subtitle must be 90 characters or fewer" };

  const body = String(input.body ?? "").trim();
  if (body.length > 600) return { error: "Body must be 600 characters or fewer" };

  const mode: NfcTileMode =
    input.mode === "embed" ? "embed" : input.mode === "event" ? "event" : "info";
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
  const base = {
    active: input.active !== false,
    sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
    title,
    subtitle: subtitle || null,
    icon: String(input.icon ?? "").trim() || "star",
    cta_text: String(input.cta_text ?? "").trim() || null,
    cta_link: ctaLink || null,
  };

  if (mode === "event") {
    const identifier = String(input.event_identifier ?? "").trim();
    if (!identifier) return { error: "Pick an event first" };

    // Re-resolved here rather than trusted from the client: the browser sends an
    // identifier, and everything else on the row — the signup URL the popup will
    // frame, the slug, the expiry — is derived from the live feed on the server.
    const resolved = await resolveEvent(identifier, input.event_sequence);
    if ("error" in resolved) return { error: resolved.error };

    return {
      payload: {
        ...base,
        mode,
        embed_url: resolved.signupUrl,
        // ChurchSuite event pages put artwork, a description and a map above the
        // form, so anything shorter opens on content nobody needs here.
        embed_size: "lg",
        // An event tile is the signup form; the details-tile fields would only
        // ever be dead weight on the row.
        body: null,
        image_url: null,
        image_path: null,
        event_identifier: identifier,
        event_sequence: resolved.sequence,
        event_slug: resolved.slug,
        event_name: resolved.name,
        event_ends_at: resolved.endsAt,
      },
    };
  }

  return {
    payload: {
      ...base,
      mode,
      embed_url: mode === "embed" ? embedUrl : null,
      embed_size: input.embed_size === "lg" ? "lg" : "md",
      body: body || null,
      image_url: String(input.image_url ?? "").trim() || null,
      image_path: String(input.image_path ?? "").trim() || null,
      ...NO_EVENT,
    },
  };
}

/**
 * Look an event up in the live feed and work out what an event tile should store.
 *
 * The failure messages matter: an admin standing in a foyer twenty minutes before
 * a service needs to know *which* of the three things went wrong and what to do
 * instead, not that the save failed.
 */
async function resolveEvent(
  identifier: string,
  sequenceInput: unknown
): Promise<
  | {
      signupUrl: string;
      slug: string;
      name: string;
      sequence: number | null;
      endsAt: string;
    }
  | { error: string }
> {
  const { series, byIdentifier } = await getEventIndex();

  // ChurchSuite reissues occurrence identifiers when a series is edited, so fall
  // back to the sequence — the more durable key — before declaring it gone.
  const sequence = Number(sequenceInput);
  const found =
    byIdentifier.get(identifier) ??
    (Number.isFinite(sequence)
      ? series.find((s) => s.seriesKey === String(sequence))
      : undefined);

  if (!found)
    return {
      error:
        "That event isn't in the ChurchSuite calendar any more — it may have finished or been removed.",
    };

  const signupUrl = eventSignupUrl(found.primary);
  if (!signupUrl)
    return {
      error: `"${found.name}" doesn't take signups in ChurchSuite. Use a details tile with a link to the event page instead.`,
    };

  if (!isEmbeddable(signupUrl)) {
    let host = "another site";
    try {
      host = new URL(signupUrl).hostname;
    } catch {
      // Keep the generic wording; the point of the message is the way out.
    }
    return {
      error: `"${found.name}" books through ${host}, which refuses to be shown inside our page. Use a details tile linking to it instead.`,
    };
  }

  return {
    signupUrl: signupUrl.includes("#")
      ? signupUrl
      : `${signupUrl}${SIGNUP_ANCHOR}`,
    slug: found.slug,
    name: found.name,
    sequence: found.primary.sequence ?? null,
    endsAt: new Date(
      Math.max(
        ...found.occurrences.map((o) => parseFeedDate(o.datetime_end).getTime())
      )
    ).toISOString(),
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
  const built = await buildPayload(input);
  if ("error" in built)
    return NextResponse.json({ error: built.error }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("nfc_tiles")
    .insert(built.payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "announcements",
    entity: "NFC tile",
    entityId: data.id,
    entityLabel: data.title,
    summary: `Added the NFC tile “${data.title}” (${data.mode} tile) to /nfc`,
    after: data,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const input = await request.json();
  const id = String(input.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const built = await buildPayload(input);
  if ("error" in built)
    return NextResponse.json({ error: built.error }, { status: 400 });

  const supabase = createServiceClient();
  const existing = await readForAudit("nfc_tiles", id);

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
    await supabase.storage.from(BUCKET).remove([existing.image_path as string]);
  }

  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "NFC tile",
    entityId: id,
    entityLabel: built.payload.title,
    summary: `Edited the NFC tile “${built.payload.title}” on /nfc`,
    before: existing,
    after: { ...built.payload },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServiceClient();
  const existing = await readForAudit("nfc_tiles", id);

  const { error } = await supabase.from("nfc_tiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path as string]);
  }

  await recordAudit({
    action: "delete",
    section: "announcements",
    entity: "NFC tile",
    entityId: id,
    entityLabel: (existing?.title as string) ?? null,
    summary: `Deleted the NFC tile “${existing?.title ?? id}” from /nfc`,
    before: existing,
  });

  return NextResponse.json({ ok: true });
}
