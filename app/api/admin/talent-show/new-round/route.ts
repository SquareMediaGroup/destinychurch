// Admin: start counting from zero (e.g. after a rehearsal). Moves to a new
// round rather than deleting anything: every device can vote again, the
// earlier votes stay in the table but stop counting. Voting is closed and the
// results hidden, so nothing goes on the screen by surprise.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { getSettings } from "@/lib/talentShow.server";

export async function POST() {
  const settings = await getSettings();
  const round = settings.round + 1;
  const { error } = await createServiceClient()
    .from("talent_show_settings")
    .update({ round, voting_open: false, results_revealed: false, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "talent show voting",
    entityId: 1,
    entityLabel: settings.show_name,
    summary: "Cleared the talent show votes and started counting again",
    before: { round: settings.round },
    after: { round },
  });
  return NextResponse.json({ ok: true, round });
}
