import { isPassageId } from "@destiny/shared";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { getPassage } from "@/lib/destinyOne/bible.server";
import { OneError, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/bible/passage?id=JHN.3.16[&bible=113]
//
// A passage's words in the church's Bible (or the one given), with the version's
// name and copyright line, from our cache or YouVersion (lib/destinyOne/
// bible.server.ts). The app never calls YouVersion itself. "unavailable" when
// YouVersion is down or not set up yet: the app then says "Couldn't load this
// verse" and offers the Bible App.

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  const caller = await requireMember(request);
  await limit("bible", caller.member.id, 120);
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const bible = Number(url.searchParams.get("bible")) || undefined;
  if (!isPassageId(id)) throw new OneError("not_found", "That isn't a Bible reference.");
  if (bible !== undefined && (!Number.isInteger(bible) || bible <= 0)) throw new OneError("invalid", "That Bible version isn't valid.");

  const result = await getPassage(id, bible);
  if (result.status === "not_found") throw new OneError("not_found", "That passage doesn't exist.");
  if (result.status === "unavailable") throw new OneError("unavailable", "Couldn't load this verse.");
  return oneJson(result.passage);
});
