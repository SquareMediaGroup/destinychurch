import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

// Mark one notification read for the signed-in admin. Per-viewer, so this
// never touches the notification row itself — only the caller's own
// (notification_id, auth_user_id) row in notification_reads.
//
// audit-exempt: read state is a per-viewer UI preference, not an admin
// action — the same reason /api/admin/onboarding isn't audited either.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notificationId = Number(id);
  if (!Number.isFinite(notificationId)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("notification_reads").upsert(
    {
      notification_id: notificationId,
      auth_user_id: user.id,
      read_at: new Date().toISOString(),
    },
    { onConflict: "notification_id,auth_user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
