// Admin: talent show voting settings, and the acts with their live totals.
// Guarded by middleware (event_admin) — see lib/adminRoles.ts.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { getSettings, getTotals, LIMITS } from "@/lib/talentShow.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  const { acts, total } = await getTotals(settings, { includeHidden: true });
  return NextResponse.json({ settings, acts, total });
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.votingOpen === "boolean") patch.voting_open = body.votingOpen;
  if (typeof body.resultsRevealed === "boolean") patch.results_revealed = body.resultsRevealed;
  if (typeof body.showName === "string") {
    const name = body.showName.trim();
    if (name.length < 1 || name.length > LIMITS.showName)
      return NextResponse.json({ error: `Show name must be 1-${LIMITS.showName} characters.` }, { status: 400 });
    patch.show_name = name;
  }

  const { error } = await createServiceClient().from("talent_show_settings").update(patch).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary =
    typeof body.votingOpen === "boolean"
      ? `${body.votingOpen ? "Opened" : "Closed"} talent show voting`
      : typeof body.resultsRevealed === "boolean"
        ? `${body.resultsRevealed ? "Revealed" : "Hid"} the talent show results on the screen`
        : "Edited talent show voting settings";
  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "talent show voting",
    entityId: 1,
    entityLabel: typeof patch.show_name === "string" ? patch.show_name : "Talent show voting",
    summary,
    after: patch,
  });
  return NextResponse.json({ ok: true });
}
