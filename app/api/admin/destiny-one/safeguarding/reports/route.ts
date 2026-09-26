import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";

// GET /api/admin/destiny-one/safeguarding/reports?status=open|reviewing|closed
//
// Reported messages with just enough context to triage: who reported, the
// group, and the message itself (even if it has since been deleted — that is
// what the soft delete is for). Opening the full conversation is the
// transcript route, which is audit-logged.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;

  const status = new URL(request.url).searchParams.get("status") ?? "open";
  if (!["open", "reviewing", "closed"].includes(status)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }

  const { data, error } = await createServiceClient()
    .from("d1_reports")
    .select(
      "id, reason, status, resolution, resolved_at, created_at, " +
        "reporter:d1_members!d1_reports_reporter_id_fkey(id, display_name), " +
        "group:d1_groups(id, name), " +
        "message:d1_messages(id, body, created_at, deleted_at, sender:d1_members!d1_messages_sender_id_fkey(id, display_name))",
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}
