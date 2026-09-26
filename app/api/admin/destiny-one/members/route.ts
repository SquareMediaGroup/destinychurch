import { NextResponse } from "next/server";
import { isAdult } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";

// GET /api/admin/destiny-one/members?status=pending
//
// App accounts, by status. `pending` is the to-do list: sign-ins that couldn't
// be matched to exactly one ChurchSuite record (no match, a shared family
// email, a child) and are waiting to be linked by hand. The sign-in email is
// included here — and only here — because it is how an admin finds the right
// ChurchSuite record.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  if (!["pending", "active", "suspended"].includes(status)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("d1_members")
    .select("id, auth_user_id, display_name, status, roles, adult_on, churchsuite_contact_id, churchsuite_child_id, created_at, last_synced_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members = await Promise.all(
    (data ?? []).map(async (m) => {
      const email = m.auth_user_id
        ? ((await supabase.auth.admin.getUserById(m.auth_user_id)).data.user?.email ?? null)
        : null;
      return {
        id: m.id,
        displayName: m.display_name,
        status: m.status,
        roles: m.roles,
        isAdult: isAdult(m.adult_on),
        churchsuiteContactId: m.churchsuite_contact_id,
        churchsuiteChildId: m.churchsuite_child_id,
        createdAt: m.created_at,
        lastSyncedAt: m.last_synced_at,
        email,
      };
    }),
  );
  return NextResponse.json({ members });
}
