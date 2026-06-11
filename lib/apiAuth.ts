import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Defense-in-depth guard for admin/staff API routes. The root proxy already
// blocks unauthenticated requests to /api/admin/* and /api/administration/*,
// but proxy bypasses have shipped in Next.js before (e.g. GHSA-26hh-7cqf-hhc6),
// so every privileged handler verifies the session itself before touching the
// service-role client.
export async function requireUser(): Promise<NextResponse | null> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
