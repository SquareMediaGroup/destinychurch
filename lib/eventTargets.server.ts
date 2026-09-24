// Pointing something at a ChurchSuite event — shared by the /nfc event tiles
// and the event blocks on the links pages.
//
// Both store the same pointer (occurrence identifier + series sequence) and
// both need the same three answers from the live feed: which series is it now,
// what signup URL can we frame, and when is it over. This was written for
// /nfc first (lib/nfcTiles.server.ts and app/api/admin/nfc/route.ts); it lives
// here so the two surfaces can't drift apart.

import "server-only";
import {
  eventSignupUrl,
  parseFeedDate,
  type EventIndex,
  type EventSeries,
} from "@destiny/shared";
import { getEventIndex } from "@/lib/events.server";
import { SIGNUP_ANCHOR, isEmbeddable } from "@/lib/nfcTiles";

/** The pointer's series in the live index, by identifier then by sequence. */
export function findSeries(
  index: EventIndex,
  identifier: string | null | undefined,
  sequence: number | null | undefined,
): EventSeries | null {
  const byIdentifier = identifier ? index.byIdentifier.get(identifier) : undefined;
  if (byIdentifier) return byIdentifier;

  // ChurchSuite reissues occurrence identifiers when a series is edited, so the
  // sequence is the more durable key — fall back to it before giving up.
  if (sequence != null && Number.isFinite(sequence)) {
    const key = String(sequence);
    return index.series.find((s) => s.seriesKey === key) ?? null;
  }
  return null;
}

/** When the whole series is over, as an ISO string. */
export function seriesEndsAt(series: EventSeries): string {
  return new Date(
    Math.max(...series.occurrences.map((o) => parseFeedDate(o.datetime_end).getTime())),
  ).toISOString();
}

/**
 * The series' signup URL if it can be shown inside our own modal, opened at the
 * form — or null when signups are off or it books through a site that refuses
 * to be framed (Eventbrite and friends).
 */
export function framableSignupUrl(series: EventSeries): string | null {
  const signupUrl = eventSignupUrl(series.primary);
  if (!signupUrl || !isEmbeddable(signupUrl)) return null;
  return signupUrl.includes("#") ? signupUrl : `${signupUrl}${SIGNUP_ANCHOR}`;
}

export interface ResolvedEventTarget {
  signupUrl: string;
  slug: string;
  name: string;
  sequence: number | null;
  endsAt: string;
}

/**
 * Look an event up in the live feed on save and work out what to store.
 *
 * `requireSignup` is the /nfc rule: a tile there IS the signup form, so an
 * event without a framable one is an error. The failure messages matter — an
 * admin in a foyer twenty minutes before a service needs to know which thing
 * went wrong and what to do instead.
 */
export async function resolveEventTarget(
  identifier: string,
  sequenceInput: unknown,
  { requireSignup }: { requireSignup: boolean },
): Promise<(Omit<ResolvedEventTarget, "signupUrl"> & { signupUrl: string | null }) | { error: string }> {
  const index = await getEventIndex();
  const sequence = Number(sequenceInput);
  const found = findSeries(index, identifier, Number.isFinite(sequence) ? sequence : null);

  if (!found)
    return {
      error:
        "That event isn't in the ChurchSuite calendar any more — it may have finished or been removed.",
    };

  const base = {
    slug: found.slug,
    name: found.name,
    sequence: found.primary.sequence ?? null,
    endsAt: seriesEndsAt(found),
  };

  const framable = framableSignupUrl(found);
  if (framable || !requireSignup) return { ...base, signupUrl: framable };

  const signupUrl = eventSignupUrl(found.primary);
  if (!signupUrl)
    return {
      error: `"${found.name}" doesn't take signups in ChurchSuite. Use a details tile with a link to the event page instead.`,
    };

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
