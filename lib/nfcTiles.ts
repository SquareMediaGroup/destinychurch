// Tiles for the /nfc "digital back of seats" page.
//
// The list served to the page is always PINNED_TILES followed by the active
// rows of `nfc_tiles`. Connect Card and Giving are hardcoded rather than seeded
// as rows because they are the two things a back-of-seat card has always had:
// they must render even if the table is empty, the migration hasn't run, or
// Supabase is unreachable ten minutes into a service.

import { createServiceClient } from "@/utils/supabase/service";
import { unstable_noStore as noStore } from "next/cache";

export type NfcTileMode = "embed" | "info";

export interface NfcTile {
  id: string;
  title: string;
  subtitle: string | null;
  /** Material Symbols Rounded ligature name. */
  icon: string;
  mode: NfcTileMode;
  /** mode="embed": the ChurchSuite URL to iframe. */
  embedUrl: string | null;
  embedSize: "md" | "lg";
  /** mode="info": the description copy. */
  body: string | null;
  imageUrl: string | null;
  /** Both modes: the link through to the full page on the site. */
  ctaText: string | null;
  ctaLink: string | null;
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
  },
];

/** Shape of a `nfc_tiles` row as it comes back from Supabase. */
interface NfcTileRow {
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
}

function mapRow(row: NfcTileRow): NfcTile {
  const mode: NfcTileMode = row.mode === "embed" ? "embed" : "info";
  // A non-framable URL (someone pasted an Eventbrite link) would render as a
  // blank iframe, so demote the tile to info mode and let the CTA carry it.
  const embeddable =
    mode === "embed" && !!row.embed_url && isEmbeddable(row.embed_url);

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    icon: row.icon || "star",
    mode: embeddable ? "embed" : "info",
    embedUrl: embeddable ? row.embed_url : null,
    embedSize: row.embed_size === "lg" ? "lg" : "md",
    body: row.body,
    imageUrl: row.image_url,
    ctaText: row.cta_text,
    ctaLink: row.cta_link,
  };
}

/** Pinned fixtures first, then the active admin-managed tiles in order. */
export async function getNfcTiles(): Promise<NfcTile[]> {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("nfc_tiles")
      .select(
        "id, title, subtitle, icon, mode, embed_url, embed_size, body, image_url, cta_text, cta_link"
      )
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    return [...PINNED_TILES, ...((data ?? []) as NfcTileRow[]).map(mapRow)];
  } catch {
    return PINNED_TILES;
  }
}
