// The "Whole site" tab's data — split from /api/admin/analytics on purpose so
// a slow or failing call to Vercel's API can never hold up the click-log
// numbers the rest of the page is built around. Same site_admin/super_admin
// gate as its sibling (lib/adminRoles.ts), same reason it's outside
// tests/unit/audit-coverage.spec.ts (GET only, reads aren't audited here).

import { NextResponse } from "next/server";
import { AUDIT_RANGES } from "@/lib/audit";
import { fetchSitePanel } from "@/lib/vercelAnalytics.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "month";
  // AUDIT_RANGES' "all time" is `days: 0`, which the audit log reads as "no
  // lower bound" — Vercel's API has no such concept, so it falls back to the
  // longest window any plan offers (24 months) and lets the plan itself
  // decide, via fetchSitePanel's "plan" error path, how far back it can go.
  const spec = AUDIT_RANGES[range as keyof typeof AUDIT_RANGES];
  const days = spec && spec.days > 0 ? spec.days : 730;

  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await fetchSitePanel(since, until);

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
