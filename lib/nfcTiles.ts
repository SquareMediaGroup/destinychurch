// Tile types and fixtures for the /nfc "digital back of seats" page.
//
// Client-safe by design: the admin page is a client component and imports
// PINNED_TILES from here, so nothing in this file may reach for the service
// client or anything marked server-only. The reads live next door in
// lib/nfcTiles.server.ts.

export type NfcTileMode = "embed" | "info" | "event";

export interface NfcTile {
  id: string;
  title: string;
  subtitle: string | null;
  /** Material Symbols Rounded ligature name. */
  icon: string;
  mode: NfcTileMode;
  /** mode="embed": the ChurchSuite URL to iframe. mode="event": its signup URL. */
  embedUrl: string | null;
  embedSize: "md" | "lg";
  /** mode="info": the description copy. */
  body: string | null;
  imageUrl: string | null;
  /** All modes: the link through to the full page on the site. */
  ctaText: string | null;
  ctaLink: string | null;
  /** mode="event": the resolved /whats-on slug, when the feed still has it. */
  eventSlug: string | null;
  /** mode="event": end of the last occurrence — the tile hides after this. */
  eventEndsAt: string | null;
}

/**
 * Only our own ChurchSuite subdomain permits framing — everything else sets
 * X-Frame-Options and would render as a blank white box. Lifted from
 * components/events/EventSignupButton.tsx so the /nfc admin can validate a
 * pasted URL with the same rule the renderer applies.
 */
export function isEmbeddable(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("churchsuite.com");
  } catch {
    return false;
  }
}

/**
 * Loading a ChurchSuite event page at this fragment opens it scrolled to the
 * signup form. Same trick, same caveats as components/events/EventSignupButton.tsx
 * — see the long comment there. Degrades to "opens at the top", which is fine.
 */
export const SIGNUP_ANCHOR = "#form_event_signup";

/**
 * Connect Card and Giving are hardcoded rather than seeded as rows because they
 * are the two things a back-of-seat card has always had: they must render even
 * if the table is empty, the migration hasn't run, or Supabase is unreachable
 * ten minutes into a service.
 */
export const PINNED_TILES: NfcTile[] = [
  {
    id: "pinned-connect-card",
    title: "Connect Card",
    subtitle: "Tell us you were here",
    icon: "person_add",
    mode: "embed",
    embedUrl: "https://destinytees.churchsuite.com/forms/kw3c1oly",
    embedSize: "md",
    body: null,
    imageUrl: null,
    ctaText: "More about connecting",
    ctaLink: "/connect-card",
    eventSlug: null,
    eventEndsAt: null,
  },
  {
    id: "pinned-giving",
    title: "Giving",
    subtitle: "Partner with the vision",
    icon: "volunteer_activism",
    mode: "embed",
    embedUrl: "https://destinytees.churchsuite.com/donate",
    embedSize: "lg",
    body: null,
    imageUrl: null,
    ctaText: "Other ways to give",
    ctaLink: "/give",
    eventSlug: null,
    eventEndsAt: null,
  },
];

/** Shape of a `nfc_tiles` row as it comes back from Supabase. */
export interface NfcTileRow {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  mode: string | null;
  embed_url: string | null;
  embed_size: string | null;
  body: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  event_identifier: string | null;
  event_sequence: number | null;
  event_slug: string | null;
  event_name: string | null;
  event_ends_at: string | null;
}

/** The columns lib/nfcTiles.server.ts selects, kept beside the row type. */
export const NFC_TILE_COLUMNS =
  "id, title, subtitle, icon, mode, embed_url, embed_size, body, image_url, cta_text, cta_link, event_identifier, event_sequence, event_slug, event_name, event_ends_at";
