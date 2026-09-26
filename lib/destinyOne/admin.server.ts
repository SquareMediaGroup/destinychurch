// Destiny One — helpers for the website admin API (/api/admin/destiny-one).
//
// Two roles, deliberately separate:
//   destiny_one_admin  — runs the app: invites, approvals, members, communities,
//                        groups, settings. Never sees message content.
//   safeguarding_admin — reports, paused groups, audited transcript review
//                        (/api/admin/destiny-one/safeguarding/*).
//
// middleware.ts already enforces these via lib/adminRoles.ts ROUTE_RULES. Each
// route re-checks, because transcript access is the most sensitive read in the
// system and shouldn't rest on a single regex.

import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles, type AdminRole } from "@/lib/adminRoles";

export interface AdminCaller {
  userId: string;
  email: string | null;
}

async function requireRole(role: AdminRole): Promise<AdminCaller | NextResponse> {
  const {
    data: { user },
  } = await createClient(await cookies()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await getRoles(createServiceClient(), user.id);
  if (!roles[role] && !roles.super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: user.id, email: user.email ?? null };
}

export const requireDestinyOneAdmin = () => requireRole("destiny_one_admin");
export const requireSafeguardingAdmin = () => requireRole("safeguarding_admin");

/**
 * Maps a Postgres error from a d1_* function to a response. The functions raise
 * with messages written for people ("A group needs at least 2 verified
 * adults."), so those pass straight through; anything else is a bug and is
 * reported generically.
 */
export function dbFailure(error: { message: string; code?: string }): NextResponse {
  const status =
    error.code === "P0001" ? 422 : error.code === "P0002" ? 404 : error.code === "22023" ? 400 : error.code === "23505" ? 409 : 500;
  if (status === 500) console.error("⚠️ Destiny One admin route failed:", error.message);
  const message =
    status === 409 ? "That already exists." : status === 500 ? "Something went wrong." : error.message;
  return NextResponse.json({ error: message }, { status });
}

/** Parses a JSON body against a zod schema, or returns the 400 to send. */
export async function parseBody<T>(
  request: Request,
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } },
): Promise<{ data: T } | { response: NextResponse }> {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return {
      response: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 }),
    };
  }
  return { data: parsed.data };
}
