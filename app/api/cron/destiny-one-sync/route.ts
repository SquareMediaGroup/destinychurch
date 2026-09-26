// Nightly Destiny One sync (03:30).
//
//  1. Refreshes every linked member from ChurchSuite: real name, the date they
//     turn 18, and whether their record is still active. Someone removed from
//     ChurchSuite goes back to `pending`, which takes them out of their
//     groups' counts — and any group that then has fewer than 2 adults
//     freezes, as it should. A ChurchSuite outage changes nothing (§5.3).
//  2. Re-checks every live group against the rules (d1_reconcile_all) as
//     defence in depth, in case anything slipped past the triggers.
//
// Same CRON_SECRET guard as the other jobs in vercel.json.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { MEMBER_COLUMNS, type MemberRow } from "@/lib/destinyOne/auth.server";
import { churchSuiteConfigured } from "@/lib/destinyOne/churchsuite.server";
import { resyncMember } from "@/lib/destinyOne/identity.server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE = 200;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to run the Destiny One sync.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const tally = { unchanged: 0, updated: 0, gone: 0, skipped: 0 };

  if (churchSuiteConfigured()) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("d1_members")
        .select(MEMBER_COLUMNS)
        .in("status", ["active", "pending"])
        .or("churchsuite_contact_id.not.is.null,churchsuite_child_id.not.is.null")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("⚠️ Destiny One sync read failed:", error.message);
        break;
      }
      for (const member of (data ?? []) as MemberRow[]) {
        tally[await resyncMember(member)] += 1;
      }
      if ((data ?? []).length < PAGE) break;
    }
  } else {
    console.warn("⚠️ ChurchSuite API not configured — Destiny One sync skipped the member refresh.");
  }

  const { data: groups, error: reconcileError } = await supabase.rpc("d1_reconcile_all");
  if (reconcileError) {
    console.error("⚠️ Destiny One reconcile failed:", reconcileError.message);
    return NextResponse.json({ error: reconcileError.message, members: tally }, { status: 500 });
  }
  const states = ((groups ?? []) as { state: string }[]).reduce<Record<string, number>>((acc, g) => {
    acc[g.state] = (acc[g.state] ?? 0) + 1;
    return acc;
  }, {});

  console.log("🔄 Destiny One sync:", { members: tally, groups: states });
  return NextResponse.json({ ok: true, members: tally, groups: states });
}
