import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { ADMIN_ROLES, getRoles } from "@/lib/adminRoles";

// The admin notification bell's feed: the most recent notifications the
// signed-in admin's roles can see, with their own read state folded in.
//
// Not an authorization boundary of its own — every admin can call this route
// (see OPEN_PATHS in lib/adminRoles.ts) and it narrows the rows itself, the
// same shape as /api/admin/search.

export const dynamic = "force-dynamic";

const LIMIT = 30;

export async function GET() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const roleFlags = await getRoles(supabase, user.id);
  const callerRoles = ADMIN_ROLES.filter((role) => roleFlags[role]);

  let query = supabase
    .from("notifications")
    .select("id, created_at, section, kind, summary, href, roles")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (!roleFlags.super_admin) {
    query = query.overlaps("roles", callerRoles);
  }

  const { data: notifications, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = notifications ?? [];
  const ids = rows.map((row) => row.id);

  const { data: reads } = ids.length
    ? await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("auth_user_id", user.id)
        .in("notification_id", ids)
    : { data: [] as { notification_id: number }[] };

  const readIds = new Set((reads ?? []).map((r) => r.notification_id));

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      summary: row.summary,
      href: row.href,
      section: row.section,
      kind: row.kind,
      createdAt: row.created_at,
      read: readIds.has(row.id),
    })),
  );
}
