import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getSmartSearchStatus } from "@/lib/serviceStatus";

// GET /api/health — public, read by status.destinytees.uk (apps/status).
//
// Always answers 200 while the site itself is running; the body says how its
// dependencies are doing, so the status page can tell "website down" apart
// from "database down". Says nothing about people or config, only ok / slow /
// down / off.

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const DB_TIMEOUT_MS = 5_000;
const DB_SLOW_MS = 2_000;

async function checkDatabase(): Promise<"ok" | "slow" | "down"> {
  const started = Date.now();
  try {
    const { error } = await createServiceClient()
      .from("service_status")
      .select("service", { head: true, count: "exact" })
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (error) return "down";
    return Date.now() - started > DB_SLOW_MS ? "slow" : "ok";
  } catch {
    return "down";
  }
}

export async function GET() {
  const database = await checkDatabase();
  // getSmartSearchStatus fails open (enabled) when Supabase can't be read, so
  // only trust it while the database answered.
  const smartSearch = database === "down" ? "unknown" : (await getSmartSearchStatus()).enabled ? "ok" : "off";

  return NextResponse.json(
    { database, smartSearch, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
