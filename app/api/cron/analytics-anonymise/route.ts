// Nightly privacy sweep for the click log.
//
// The click row is kept forever — a church compares this Easter with last
// Easter, and a 90-day window would make that impossible. The IP address is
// not: it earns its keep for a few weeks (telling a genuine flyer spike apart
// from one person refreshing) and after that it is just a personal identifier
// sitting in a table nobody needs it in. So the row survives and the IP is
// blanked; visitor_hash — computed from the IP at write time but never itself
// personal data — survives too, so unique-visitor counts stay correct for
// rows written years ago.
//
// Its own cron rather than a tail on the weekly audit report, because this has
// to run every night to keep the promise the privacy notice makes, and the
// weekly report only runs on Sundays.
//
// Same shape as app/api/cron/hr-review-reminders/route.ts: CRON_SECRET, fail
// closed if it's unset, one RPC call, console summary.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { refuseCron } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

const RETAIN_DAYS = Number(process.env.ANALYTICS_IP_RETENTION_DAYS) || 90;

export async function GET(request: Request) {
  // CRON_SECRET bearer only, failing closed when it isn't set (lib/cronAuth.ts).
  const refused = refuseCron(request, "anonymise the click log");
  if (refused) return refused;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("engagement_anonymise_ips", {
    retain_days: RETAIN_DAYS,
  });

  if (error) {
    console.error("⚠️ click log anonymise failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  console.log("🧹 click log anonymise:", result);

  return NextResponse.json({ ok: true, retainDays: RETAIN_DAYS, ...result });
}
