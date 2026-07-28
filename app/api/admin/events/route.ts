// Picker feed for /admin/featured-event.
//
// Projects the ChurchSuite index down to what the picker needs. Recurring
// events arrive as one entry with a sessionCount, so staff pick "Destiny 12:2"
// once rather than choosing between seven identical-looking rows.

import { NextResponse } from "next/server";
import { eventImage, parseFeedDate } from "@destiny/shared";
import { getEventIndex } from "@/lib/events.server";

// Admin must never be shown a stale list — they may be featuring an event that
// was added to ChurchSuite moments ago.
export const dynamic = "force-dynamic";

export async function GET() {
  const { series } = await getEventIndex();

  return NextResponse.json({
    events: series.map((s) => ({
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
    })),
  });
}
