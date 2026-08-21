// Authorisation for /portal and /api/portal — the staff self-service side of
// HR, distinct from the admin RBAC system in lib/adminRoles.ts.
//
// A portal user's identity is "does this auth user have a linked hr_staff
// row", which is not an access-level boolean and must never become one:
// conflating it with admin_roles would let "can see my own payslip" leak
// into "can manage HR". This mirrors lib/liveChatAuth.ts's readHost() — the
// one other place in the app that authorises an authenticated user outside
// the admin_roles table.
//
// Every /api/portal/* handler must call readPortalUser() and scope every
// query to the returned staff.id — never to anything a client supplies.

import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";
import type { Staff } from "@/lib/hr";

type ServiceClient = ReturnType<typeof createServiceClient>;

export interface PortalIdentity {
  userId: string;
  staff: Staff;
}

/** Cheap boolean check for middleware — does this auth user have a linked hr_staff row? */
export async function isLinkedToStaff(
  supabase: ServiceClient,
  authUserId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("hr_staff")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * The signed-in portal user, or null. Looks up hr_staff by auth_user_id —
 * never by anything a client supplies — so a request can never impersonate
 * another staff member's record.
 */
export async function readPortalUser(): Promise<PortalIdentity | null> {
  const jar = await cookies();
  const supabase = createClient(jar);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: staff } = await service
    .from("hr_staff")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!staff) return null;
  return { userId: user.id, staff: staff as Staff };
}

/**
 * Where a just-authenticated user should land: /admin if they hold any
 * admin role (super_admin included), else /portal if they're linked staff,
 * else null — an authenticated account with neither, which the caller should
 * treat as "not set up" rather than redirect-loop.
 */
export async function resolvePostLoginPath(
  service: ServiceClient,
  authUserId: string,
): Promise<"/admin" | "/portal" | null> {
  const roles = await getRoles(service, authUserId);
  if (Object.values(roles).some(Boolean)) return "/admin";
  if (await isLinkedToStaff(service, authUserId)) return "/portal";
  return null;
}
