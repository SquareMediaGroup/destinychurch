// The vocabulary of the engagement log — shared by the recorder
// (lib/engagement.server.ts), the read API, the /admin/analytics page and the
// beacon on /nfc and /links.
//
// Nothing in here touches the database or `next/headers`, so it is safe to
// import from a client component. The server half lives in engagement.server.ts.
//
// The shape mirrors lib/audit.ts on purpose — closed sets so the page's filters
// can be chips rather than a free-text box, and so a typo can't invent a source
// that nothing will ever match.
//
// The one thing to hold onto: an "engagement event" is always *someone
// following something we published*. A shortlink click, a tap on the seat-back
// NFC page and a press on a /links card are the same act arriving by three
// routes, which is why they share one table and one vocabulary.

import { AUDIT_RANGES, rangeStart } from "@/lib/audit";

/* ── Sources ───────────────────────────────────────────────────────────────── */

export const ENGAGEMENT_SOURCES = {
  redirect: {
    label: "Short links",
    // What it counts, in the words the page uses on the axis and in totals.
    noun: "click",
    icon: "alt_route",
    description: "Vanity URLs on destinytees.uk — flyers, posters, socials.",
  },
  nfc: {
    label: "Seat backs",
    noun: "tap",
    icon: "nfc",
    description: "Tiles on /nfc, opened by the NFC tag or QR code on a seat.",
  },
  links: {
    label: "Next Steps",
    noun: "click",
    icon: "list_alt",
    description: "The six cards on /links.",
  },
} as const;

export type EngagementSource = keyof typeof ENGAGEMENT_SOURCES;

export const ENGAGEMENT_SOURCE_KEYS = Object.keys(
  ENGAGEMENT_SOURCES,
) as EngagementSource[];

export function isEngagementSource(value: unknown): value is EngagementSource {
  return typeof value === "string" && value in ENGAGEMENT_SOURCES;
}

/* ── Source tags ───────────────────────────────────────────────────────────── */

/**
 * `?s=` on an incoming link — how the person got to it in the physical world.
 *
 * This is the column that answers the question the church actually asks about
 * print: the QR code on a flyer and the same link posted on Facebook resolve to
 * one slug, and without this tag there is no way to tell which of the two the
 * money should follow.
 *
 * A closed set, so a mistyped `?s=` on a printed poster (which cannot be fixed
 * after the fact) is filed as "direct" rather than inventing a category.
 */
export const SRC_TAGS = {
  qr: { label: "QR code", icon: "qr_code_2" },
  nfc: { label: "NFC tag", icon: "nfc" },
  print: { label: "Print", icon: "print" },
  social: { label: "Social", icon: "share" },
} as const;

export type SrcTag = keyof typeof SRC_TAGS;

export function normaliseSrcTag(value: unknown): SrcTag | null {
  if (typeof value !== "string") return null;
  const tag = value.trim().toLowerCase();
  return tag in SRC_TAGS ? (tag as SrcTag) : null;
}

export function srcTagLabel(tag: string | null): string {
  if (!tag) return "Direct";
  return tag in SRC_TAGS ? SRC_TAGS[tag as SrcTag].label : tag;
}

/* ── Ranges ────────────────────────────────────────────────────────────────── */

// Re-exported rather than redefined so the analytics range chips and the audit
// log's stay identical. Two copies of "what does 30 days mean" is one copy too
// many, and the audit page got there first.
export { AUDIT_RANGES as ENGAGEMENT_RANGES, rangeStart };

/* ── Wire format ───────────────────────────────────────────────────────────── */

/** One row of a grouped breakdown, as `engagement_top()` returns it. */
export interface EngagementBucket {
  key: string;
  events: number;
  visitors: number;
  /** Only set when grouping by target — see the note in the SQL function. */
  label: string | null;
}

export interface EngagementPoint {
  /** YYYY-MM-DD, bucketed in Europe/London rather than UTC. */
  day: string;
  events: number;
  visitors: number;
}

export interface EngagementRollup {
  totals: {
    events: number;
    visitors: number;
    targets: number;
    /** Excluded from every other figure here unless bots were asked for. */
    bots: number;
  };
  timeseries: EngagementPoint[];
  bySource: EngagementBucket[];
  byTarget: EngagementBucket[];
  byCountry: EngagementBucket[];
  byReferrer: EngagementBucket[];
  byDevice: EngagementBucket[];
  byBrowser: EngagementBucket[];
  bySrcTag: EngagementBucket[];
}

/** The body `POST /api/track` accepts from /nfc and /links. */
export interface TrackBeacon {
  source: EngagementSource;
  targetKey: string;
  targetLabel?: string | null;
}

/* ── Display helpers ───────────────────────────────────────────────────────── */

/** ISO-3166 alpha-2 to a flag-free readable name for the countries we see. */
const COUNTRY_NAMES: Record<string, string> = {
  GB: "United Kingdom",
  IE: "Ireland",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  ZA: "South Africa",
  NG: "Nigeria",
  IN: "India",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  NL: "Netherlands",
  PL: "Poland",
  RO: "Romania",
};

export function countryName(code: string | null): string {
  if (!code) return "Unknown";
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

/**
 * The ISO 3166-2 fragment Vercel sends. For the UK this is the *country*
 * within the UK, not the county — so a Teesside visitor reads "England", which
 * is worth spelling out before someone reads "ENG" as an error.
 */
const UK_REGIONS: Record<string, string> = {
  ENG: "England",
  SCT: "Scotland",
  WLS: "Wales",
  NIR: "Northern Ireland",
};

export function regionName(code: string | null): string {
  if (!code) return "Unknown";
  return UK_REGIONS[code.toUpperCase()] ?? code;
}

/** "facebook.com" → "Facebook", where we recognise it; the host otherwise. */
const REFERRER_NAMES: Record<string, string> = {
  "facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "l.instagram.com": "Instagram",
  "youtube.com": "YouTube",
  "t.co": "X / Twitter",
  "x.com": "X / Twitter",
  "linkedin.com": "LinkedIn",
  "google.com": "Google",
  "google.co.uk": "Google",
  "bing.com": "Bing",
  "churchsuite.com": "ChurchSuite",
  "destinytees.uk": "Our own site",
};

export function referrerName(host: string | null): string {
  if (!host) return "Direct";
  const bare = host.replace(/^www\./, "").toLowerCase();
  return REFERRER_NAMES[bare] ?? bare;
}

/** Compact figures for the metric tiles — 1200 reads as "1.2k". */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) < 1000) return String(value);
  if (Math.abs(value) < 1_000_000) {
    const k = value / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const m = value / 1_000_000;
  return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
}

/** "27 Aug" — the axis label for a daily bucket. */
export function shortDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
