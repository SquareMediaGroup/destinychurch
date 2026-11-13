import { requireMember } from "@/lib/destinyOne/auth.server";
import { verseOfTheDay } from "@/lib/destinyOne/bible.server";
import { OneError, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/bible/votd
//
// YouVersion's verse of the day (their pick; we can't choose it), in the church's
// Bible. Fetched once a day for everyone (d1_bible_votd), so it costs one call a
// day. The day changes at midnight UK time.

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  await requireMember(request);
  const { date, result } = await verseOfTheDay();
  if (result.status !== "ok") throw new OneError(result.status === "not_found" ? "not_found" : "unavailable", "The verse of the day isn't available right now.");
  return oneJson({ ...result.passage, date });
});
