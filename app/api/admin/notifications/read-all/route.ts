import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { ADMIN_ROLES, getRoles } from "@/lib/adminRoles";

// Mark every notification currently visible to the signed-in admin's roles
// as read, in one go — the "Mark all read" control in the bell.
//
// audit-exempt: read state is a per-viewer UI preference, not an admin
// action — the same reason /api/admin/onboarding isn't audited either.

export async function POST() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const roleFlags = await getRoles(supabase, user.id);
  const callerRoles = ADMIN_ROLES.filter((role) => roleFlags[role]);

  let query = supabase.from("notifications").select("id");
  if (!roleFlags.super_admin) {
    query = query.overlaps("roles", callerRoles);
  }

  const { data: notifications, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = notifications ?? [];
  if (rows.length === 0) return NextResponse.json({ success: true, count: 0 });

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from("notification_reads").upsert(
    rows.map((row) => ({
      notification_id: row.id,
      auth_user_id: user.id,
      read_at: now,
    })),
    { onConflict: "notification_id,auth_user_id" },
  );

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  return NextResponse.json({ success: true, count: rows.length });
}
