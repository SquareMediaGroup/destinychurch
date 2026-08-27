// The beacon behind /nfc and /links — public, unauthenticated, and reachable
// by anyone with the URL. Three things keep that from being a hole:
//
//   1. `source` may only be "nfc" or "links" (BEACON_SOURCES in lib/track.ts).
//      "redirect" is not accepted here at all: shortlink clicks are what
//      decide whether printing a run of flyers was worth it, so they may only
//      ever come from the server-side path in app/[slug]/page.tsx. If a
//      browser could post them, anyone with curl could inflate a flyer's
//      numbers to order.
//   2. `targetKey` is checked against the real thing it claims to be — one of
//      the six /links hrefs, or a live nfc_tiles id (fixture or row). The body
//      can name a target; it can never invent one, and the label written to
//      the log always comes from our own lookup, never from the request.
//   3. Rate-limited, but not at the site-wide default. lib/rateLimit.ts's
//      15/minute exists for endpoints one person hits repeatedly; this one is
//      hit by a whole room. On a Sunday the congregation is behind one church
//      WiFi NAT IP, and the 16th person to tap a seat-back tile is not abuse.
//
// Always answers 204, whatever happened — a beacon has nobody to tell, and a
// visible error mid-service helps no one. Not under /api/admin, so
// tests/unit/audit-coverage.spec.ts doesn't apply here: this records visitors,
// not admin actions, and reads/writes here are never audited on purpose.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { readRequestContext, recordEngagement } from "@/lib/engagement.server";
import { isBeaconSource } from "@/lib/track";
import { findLinksStep } from "@/lib/linksSteps";
import { PINNED_TILES } from "@/lib/nfcTiles";

export const dynamic = "force-dynamic";

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

/** The seat-back tile it claims to be, or null if there's no such tile. */
async function resolveNfcTile(id: string): Promise<{ label: string } | null> {
  const pinned = PINNED_TILES.find((t) => t.id === id);
  if (pinned) return { label: pinned.title };

  const { data } = await createServiceClient()
    .from("nfc_tiles")
    .select("title")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  return data ? { label: data.title } : null;
}

export async function POST(request: Request) {
  try {
    // Namespaced per lib/rateLimit.ts's own convention, with a ceiling sized
    // for a room full of people rather than one person — see the file header.
    const ip = clientIp(request);
    if (checkRateLimit(`track:${ip}`, 600).limited) return NO_CONTENT();

    // text/plain body, matching lib/track.ts's sendBeacon call — sendBeacon
    // can't reliably send application/json cross-context, so both ends agree
    // on text/plain and parse it as JSON here.
    const raw = await request.text();
    const body = JSON.parse(raw) as {
      source?: string;
      targetKey?: string;
    };

    if (!isBeaconSource(body.source)) return NO_CONTENT();
    const targetKey = typeof body.targetKey === "string" ? body.targetKey.slice(0, 300) : "";
    if (!targetKey) return NO_CONTENT();

    // The label is always our own lookup, never the request body — a browser
    // can pick which real target it's reporting, not what to call it.
    const targetLabel =
      body.source === "links"
        ? findLinksStep(targetKey)?.title ?? null
        : (await resolveNfcTile(targetKey))?.label ?? null;
    if (targetLabel === null) return NO_CONTENT();

    const ctx = readRequestContext(request.headers);
    await recordEngagement({
      source: body.source,
      targetKey,
      targetLabel,
      ...ctx,
    });
  } catch {
    // A beacon has nobody to tell.
  }

  return NO_CONTENT();
}
