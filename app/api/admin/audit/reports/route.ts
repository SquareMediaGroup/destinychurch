// The stored weekly reports, newest first — the "Weekly reports" panel on
// /admin/audit.
//
// Super Admin only by the same fail-closed rule as the routes beside it.
// Read-only: reports are written by app/api/cron/audit-weekly-report, never
// from the browser.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export const dynamic = "force-dynamic";

/** A season's worth. Enough to scroll back through, small enough for one page. */
const LIMIT = 12;

export async function GET() {
  const { data, error } = await createServiceClient()
    .from("audit_reports")
    .select("*")
    .order("period_end", { ascending: false })
    .limit(LIMIT);

  if (error) {
    // A missing table means the migration hasn't run — the page shows this as
    // an empty panel with the reason, rather than pretending there are none.
    const missingTable = /relation .*audit_reports.* does not exist/i.test(error.message);
    return NextResponse.json(
      {
        error: missingTable
          ? "The audit report table isn't there yet — run supabase/migrations/20260826_audit_log.sql."
          : error.message,
      },
      { status: missingTable ? 503 : 500 },
    );
  }

  return NextResponse.json(
    { reports: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
