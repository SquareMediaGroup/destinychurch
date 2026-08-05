// Reading the /nfc tiles: the DB rows, and resolving event tiles against the
// live ChurchSuite feed.
//
// Split out of lib/nfcTiles.ts because event resolution needs getEventIndex(),
// which is server-only, while the admin page is a client component that imports
// the tile fixtures. Keeping the two apart means a client bundle can't pull in
// the service client.

import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import {
  eventSignupUrl,
  formatKicker,
  parseFeedDate,
  type EventIndex,
  type EventSeries,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { getEventIndex } from "@/lib/events.server";
import {
  NFC_TILE_COLUMNS,
  PINNED_TILES,
  SIGNUP_ANCHOR,
  isEmbeddable,
  type NfcTile,
  type NfcTileMode,
  type NfcTileRow,
} from "@/lib/nfcTiles";

function mapRow(row: NfcTileRow): NfcTile {
  // Explicitly three-way: the old binary fallback would have swallowed an
  // `event` row into `info` and rendered it as an empty details popup.
  const stored: NfcTileMode =
    row.mode === "embed" ? "embed" : row.mode === "event" ? "event" : "info";

  // A non-framable URL (someone pasted an Eventbrite link) would render as a
  // blank iframe, so demote the tile to info mode and let the CTA carry it.
  const embeddable =
    stored !== "info" && !!row.embed_url && isEmbeddable(row.embed_url);
  const mode: NfcTileMode = embeddable ? stored : "info";

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    icon: row.icon || "star",
    mode,
    embedUrl: embeddable ? row.embed_url : null,
    // ChurchSuite event pages carry artwork, a description and a map above the
    // form, so an event tile always wants the tall popup.
    embedSize: mode === "event" || row.embed_size === "lg" ? "lg" : "md",
    body: row.body,
    imageUrl: row.image_url,
    ctaText: row.cta_text,
    ctaLink: row.cta_link,
    eventSlug: row.event_slug,
    eventEndsAt: row.event_ends_at,
  };
}

/** The row's series in the live index, by identifier then by sequence. */
function findSeries(row: NfcTileRow, index: EventIndex): EventSeries | null {
  const byIdentifier = row.event_identifier
    ? index.byIdentifier.get(row.event_identifier)
    : undefined;
  if (byIdentifier) return byIdentifier;

  // ChurchSuite reissues occurrence identifiers when a series is edited, so the
  // sequence is the more durable key — fall back to it before giving up.
  if (row.event_sequence != null) {
    const key = String(row.event_sequence);
    return index.series.find((s) => s.seriesKey === key) ?? null;
  }
  return null;
}

/**
 * Refresh an event tile from the feed, or drop it if its event has finished.
 *
 * The clock read stays here on the server: /nfc renders per-request (noStore),
 * and doing this client-side would risk a hydration mismatch across the moment
 * an event ends — the same reason EventsGrid and EventCard are clock-free.
 */
function resolveEventTile(
  tile: NfcTile,
  row: NfcTileRow,
  index: EventIndex,
  now: number
): NfcTile | null {
  if (row.event_ends_at && new Date(row.event_ends_at).getTime() <= now) {
    return null;
  }

  const series = findSeries(row, index);
  // No hit means either the feed is down (fetchChurchSuiteEvents returns [] on
  // any error) or the event was pulled from ChurchSuite. Either way the stored
  // snapshot is still the best answer, and event_ends_at still governs expiry.
  if (!series) return tile;

  const signupUrl = eventSignupUrl(series.primary);
  const fresh =
    signupUrl && isEmbeddable(signupUrl)
      ? signupUrl.includes("#")
        ? signupUrl
        : `${signupUrl}${SIGNUP_ANCHOR}`
      : null;

  return {
    ...tile,
    embedUrl: fresh ?? tile.embedUrl,
    // mapRow demotes a tile whose stored URL stopped being framable; a good URL
    // from the feed earns the signup popup back.
    mode: fresh ? "event" : tile.mode,
    // Blank subtitle means "use the live date", so the tile face always shows
    // when the event actually is, even after ChurchSuite moves it.
    subtitle: tile.subtitle || formatKicker(series.primary),
    eventSlug: series.slug,
    eventEndsAt: new Date(
      Math.max(
        ...series.occurrences.map((o) => parseFeedDate(o.datetime_end).getTime())
      )
    ).toISOString(),
  };
}

/** Pinned fixtures first, then the active admin-managed tiles in order. */
export async function getNfcTiles(): Promise<NfcTile[]> {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("nfc_tiles")
      .select(NFC_TILE_COLUMNS)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const rows = (data ?? []) as unknown as NfcTileRow[];

    // Only pay for the feed when a tile actually points at an event.
    const index = rows.some((r) => r.mode === "event")
      ? await getEventIndex()
      : null;
    const now = Date.now();

    const tiles: NfcTile[] = [];
    for (const row of rows) {
      const tile = mapRow(row);
      if (row.mode !== "event" || !index) {
        tiles.push(tile);
        continue;
      }
      const resolved = resolveEventTile(tile, row, index, now);
      if (resolved) tiles.push(resolved);
    }

    return [...PINNED_TILES, ...tiles];
  } catch {
    return PINNED_TILES;
  }
}
