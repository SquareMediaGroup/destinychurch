import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { loadMessageKeyring, openBody, openContent, openReason } from "@/lib/destinyOne/crypto.server";
import type { D1MessageContent } from "@destiny/shared";

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
  await loadMessageKeyring();

  const status = new URL(request.url).searchParams.get("status") ?? "open";
  if (!["open", "reviewing", "closed"].includes(status)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }

  const { data, error } = await createServiceClient()
    .from("d1_reports")
    .select(
      "id, group_id, reason, status, resolution, resolved_at, created_at, " +
        "reporter:d1_members!d1_reports_reporter_id_fkey(id, display_name), " +
        "group:d1_groups(id, name), " +
        "message:d1_messages(id, body, content, created_at, deleted_at, deleted_by_admin, sender:d1_members!d1_messages_sender_id_fkey(id, display_name))",
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reasons and message text are encrypted at rest; open them for the reviewer.
  type Row = { group_id: string; reason: string; message: { body: string | null; content: D1MessageContent | null } | null };
  const reports = ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    reason: openReason(r.reason, r.group_id),
    message: r.message
      ? { ...r.message, body: openBody(r.message.body, r.group_id), content: openContent(r.message.content, r.group_id) }
      : null,
  }));
  return NextResponse.json({ reports });
}
