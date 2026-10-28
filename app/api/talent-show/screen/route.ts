// Public: what the results screen shows. Until an admin reveals the results
// this is the vote count only, so the screen URL can't be used to peek.

import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { getSettings, getTotals, rankActs } from "@/lib/talentShow.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (checkRateLimit(`talent-screen:${clientIp(request)}`, 120).limited)
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const settings = await getSettings();
  const { acts, total } = await getTotals(settings);
  return NextResponse.json({
    showName: settings.show_name,
    open: settings.voting_open,
    revealed: settings.results_revealed,
    total,
    actCount: acts.length,
    results: settings.results_revealed
      ? rankActs(acts).map((a) => ({
          id: a.id,
          name: a.name,
          performers: a.performers,
          votes: a.votes,
          judgeXs: a.judge_xs,
          score: a.score,
        }))
      : [],
  });
}
