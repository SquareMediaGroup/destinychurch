// Destiny One — helpers for the safeguarding admin API (/api/admin/destiny-one).
//
// middleware.ts already requires the safeguarding_admin role for these paths
// (lib/adminRoles.ts ROUTE_RULES). This re-checks inside the route as well,
// because transcript access is the most sensitive read in the whole system and
// shouldn't rest on a single regex.

import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";

export async function requireSafeguardingAdmin(): Promise<{ userId: string; email: string | null } | NextResponse> {
  const {
    data: { user },
  } = await createClient(await cookies()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await getRoles(createServiceClient(), user.id);
  if (!roles.safeguarding_admin && !roles.super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: user.id, email: user.email ?? null };
}

export function dbFailure(error: { message: string; code?: string }): NextResponse {
  const status = error.code === "P0001" ? 422 : error.code === "P0002" ? 404 : 500;
  if (status === 500) console.error("⚠️ Destiny One admin route failed:", error.message);
  return NextResponse.json({ error: status === 500 ? "Something went wrong." : error.message }, { status });
}
