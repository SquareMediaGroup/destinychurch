import { requireMember } from "@/lib/destinyOne/auth.server";
import { listUpcomingEvents } from "@/lib/destinyOne/events.server";
import { oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/events — upcoming ChurchSuite events, for the Event
// attach picker in the composer and the Upcoming events list (Search tab). Any signed-in member may browse; actually
// sending one into a group still requires being a current member of that
// group, checked when the message posts.

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  await requireMember(request);
  return oneJson(await listUpcomingEvents());
});
