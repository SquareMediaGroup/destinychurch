// YouTube sermon titles follow the channel's own convention: "Sermon Title |
// Speaker Name | Destiny Church LIVE" — but real titles are messier than that
// tidy shape. Checked against the channel's actual public RSS feed before
// writing this: both "|" and "||" are used interchangeably as the delimiter
// (not as a 2-vs-3-segment signal), most speaker segments carry no honorific
// at all ("Nkereuwem Ekanem", "Ruth Wada, Jean Alvarez, Phoebe Smyrell"), and
// at least one title skips the pipe entirely in favour of " - Ps Catherine
// Harris". Multiple guest speakers are joined by "&" or "," in one segment —
// kept as one raw string rather than split into individual people.

const FILLER_RE = /^(?:destiny\s*church(?:\s*tees\s*valley)?\s*live|dc\s*live)$/i;
const HONORIFIC_RE = /\b(ps|pastor|rev|pr|bishop|dr|apostle|minister)\.?\b/gi;
const SPEAKER_HINT_RE = /\b(ps|pastor|rev|pr|bishop|dr|apostle|minister)\b/i;

/** Local copy of youtube.ts's entity decoder — kept separate to avoid a cycle
 *  (youtube.ts imports parseYouTubeTitle from here). */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Split a raw YouTube title into a clean sermon title and, when present, the
 * speaker's name(s).
 */
export function parseYouTubeTitle(raw: string): { title: string; speaker: string | null } {
  const clean = decodeEntities(raw).trim();
  if (!clean) return { title: clean, speaker: null };

  const segments = clean
    .split(/\s*\|\|?\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Strip trailing filler segments ("Destiny Church LIVE", "DC Live").
  while (segments.length > 1 && FILLER_RE.test(segments[segments.length - 1])) {
    segments.pop();
  }

  if (segments.length >= 2) {
    return {
      title: segments.slice(0, -1).join(" | "),
      speaker: segments[segments.length - 1],
    };
  }

  const only = segments[0] ?? clean;
  return splitOnDash(only) ?? { title: only, speaker: null };
}

/**
 * Fallback for a title with no "|" delimiter at all — the rare
 * " - Speaker Name" convention seen on both feeds (a Buzzsprout episode title
 * is often the same raw text as its YouTube counterpart). Gated on an
 * honorific so a title that legitimately contains " - " (e.g. "At The Movies
 * 6 - Love Transforms Us") isn't misparsed as having a speaker.
 */
export function splitOnDash(text: string): { title: string; speaker: string } | null {
  const dashMatch = text.match(/^(.+?)\s+-\s+([^-]+)$/);
  if (dashMatch && SPEAKER_HINT_RE.test(dashMatch[2])) {
    return { title: dashMatch[1].trim(), speaker: dashMatch[2].trim() };
  }
  return null;
}

/**
 * Normalise a speaker name for comparison across the two independent feeds —
 * lowercase, honorifics stripped, whitespace collapsed. "Ps John Smith" and
 * "Pastor John Smith" normalise to the same value.
 */
export function normalizeSpeakerName(name: string | null | undefined): string | null {
  if (!name) return null;
  const stripped = name.replace(HONORIFIC_RE, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return stripped || null;
}
