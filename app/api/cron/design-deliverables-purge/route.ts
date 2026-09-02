// Deletes design deliverables the requester has confirmed they have, once
// they've sat for at least 48 hours since confirmation. See
// supabase/migrations/20260903_04_design_deliverable_confirm_delete.sql for
// why 48h is a floor, not an exact deadline: this cron runs daily like every
// other one in this project, so the real-world wait is 48-72h.
//
// This route is NOT under /api/admin, so middleware.ts doesn't guard it. It
// authorises with CRON_SECRET instead, the way a scheduled caller has to.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { deleteDeliverableStorage } from "@/lib/designTickets.server";

export const dynamic = "force-dynamic";

const CONFIRMED_RETENTION_HOURS = 48;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Fail closed. An unset secret makes this an open "delete confirmed
  // deliverables" endpoint, which is worse than the cron silently not running.
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to purge design deliverables.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - CONFIRMED_RETENTION_HOURS * 60 * 60 * 1000).toISOString();

  const { data: due } = await supabase
    .from("design_ticket_deliverables")
    .select("id, ticket_id, file_name, storage_kind, playbook_asset_token, file_path")
    .not("confirmed_at", "is", null)
    .lte("confirmed_at", cutoff);

  let deleted = 0;
  const failures: string[] = [];

  for (const file of due ?? []) {
    try {
      await deleteDeliverableStorage(supabase, file);
      const { error } = await supabase
        .from("design_ticket_deliverables")
        .delete()
        .eq("id", file.id);
      if (error) throw error;
      deleted++;
    } catch (err) {
      failures.push(file.id);
      console.error(`🧹 design deliverable purge failed for ${file.id} (${file.file_name}):`, err);
    }
  }

  console.log(`🧹 design deliverables purge: ${deleted} deleted, ${failures.length} failed`);

  return NextResponse.json({ ok: true, deleted, failed: failures.length });
}
