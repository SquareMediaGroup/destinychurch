// Reading the click log — the data behind /admin/analytics.
//
// site_admin + super_admin (see the ROUTE_RULES entry in lib/adminRoles.ts).
// GET only, so tests/unit/audit-coverage.spec.ts has nothing to say about it:
// reads are deliberately not audited in this codebase, and an analytics page
// that logged every time someone looked at it would be the loudest section of
// the audit log within a week.
//
// One RPC call, engagement_rollup(), does every aggregate in one round trip —
// totals, the daily trend and every breakdown — because click volume is
// unbounded and these numbers are the product, not a navigation aid (unlike
// the audit log's capped facet scan in app/api/admin/audit/route.ts). See the
// migration for why that's computed in Postgres rather than folded in JS.
//
// The whole-site Vercel panel is intentionally a separate route
// (/api/admin/analytics/site) rather than joined in here: a slow or failing
// Vercel API call must never hold up the click data this page is built around.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { rangeStart } from "@/lib/audit";
import { isEngagementSource } from "@/lib/engagement";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "month";
  const sourceParam = searchParams.get("source");
  const source = isEngagementSource(sourceParam) ? sourceParam : null;
  const target = searchParams.get("target");
  const includeBots = searchParams.get("bots") === "1";

  const since = rangeStart(range);

  const { data, error } = await createServiceClient().rpc("engagement_rollup", {
    p_since: since,
    p_source: source,
    p_target: target,
    p_include_bots: includeBots,
  });

  if (error) {
    // PostgREST answers PGRST202 ("could not find the function") when the
    // migration hasn't been applied yet — say so plainly rather than leaving
    // the page showing an empty chart that looks correct.
    const missingSchema =
      error.code === "PGRST202" || /engagement_(rollup|events)/i.test(error.message);
    return NextResponse.json(
      {
        error: missingSchema
          ? "The click log isn't there yet — run supabase/migrations/20260827_engagement_events.sql."
          : error.message,
      },
      { status: missingSchema ? 503 : 500 },
    );
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
