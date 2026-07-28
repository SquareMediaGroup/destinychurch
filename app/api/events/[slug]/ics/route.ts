// Calendar download for an event series.
//
// Deliberately outside the /api/admin/* matcher in middleware.ts — this serves
// only what the public ChurchSuite feed already publishes, so it needs no auth.
//
// Without ?occurrence= the file contains every upcoming session, so subscribing
// to a recurring event adds the whole run in one go.

import { buildIcs } from "@destiny/shared";
import { getEventIndex } from "@/lib/events.server";

export const revalidate = 300;

const BASE_URL = "https://destinytees.uk";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const index = await getEventIndex();

  // Same identifier fallback as the page, so a disambiguated or renamed URL
  // still downloads rather than 404ing.
  const series =
    index.bySlug.get(slug) ??
    index.byIdentifier.get(/-([a-z0-9]{6,10})$/i.exec(slug)?.[1] ?? slug);

  if (!series) {
    return new Response("Event not found", { status: 404 });
  }

  const occurrence =
    new URL(request.url).searchParams.get("occurrence")?.trim() || undefined;

  const body = buildIcs({ series, occurrence, baseUrl: BASE_URL });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${series.slug}.ics"`,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
