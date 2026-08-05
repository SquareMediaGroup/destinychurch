// Picker feed for /admin/featured-event and the event tiles on /admin/nfc.
//
// Projects the ChurchSuite index down to what the pickers need. Recurring
// events arrive as one entry with a sessionCount, so staff pick "Destiny 12:2"
// once rather than choosing between seven identical-looking rows.

import { NextResponse } from "next/server";
import { eventImage, eventSignupUrl, parseFeedDate } from "@destiny/shared";
import { getEventIndex } from "@/lib/events.server";
import { isEmbeddable } from "@/lib/nfcTiles";

// Admin must never be shown a stale list — they may be featuring an event that
// was added to ChurchSuite moments ago.
export const dynamic = "force-dynamic";

export async function GET() {
  const { series } = await getEventIndex();

  return NextResponse.json({
    events: series.map((s) => {
      // /admin/nfc only offers events whose signup can be framed in the popup,
      // so it needs both facts up front rather than discovering them on save.
      const signupUrl = eventSignupUrl(s.primary);

      return {
        slug: s.slug,
        identifier: s.primary.identifier ?? null,
        sequence: s.primary.sequence ?? null,
        id: s.primary.id,
        name: s.name,
        start: s.primary.datetime_start,
        end: s.primary.datetime_end,
        // When the whole series finishes — stored so the featured row can
        // survive a ChurchSuite outage without going stale.
        endsAt: new Date(
          Math.max(
            ...s.occurrences.map((o) => parseFeedDate(o.datetime_end).getTime()),
          ),
        ).toISOString(),
        image: eventImage(s.primary) ?? null,
        category: s.primary.category?.name ?? null,
        location: s.primary.location?.name ?? null,
        sessionCount: s.sessionCount,
        /** Null when signups are switched off in ChurchSuite. */
        signupUrl,
        /** False for third-party ticketing (Eventbrite refuses to be framed). */
        signupEmbeddable: signupUrl ? isEmbeddable(signupUrl) : false,
      };
    }),
  });
}
