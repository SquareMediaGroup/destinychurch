import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { adminTakedownSchema } from "@/lib/destinyOne/schemas";

// POST /api/admin/destiny-one/safeguarding/messages/[id]/remove  { reason }
//
// Take a message down for everyone (usually one that was reported). It is a
// soft delete like any other: members see "This message was deleted", the
// content stays for review until the retention purge, and the takedown is
// recorded in the audit log with the reason.

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;

  const messageId = Number((await params).id);
  if (!Number.isSafeInteger(messageId) || messageId <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await parseBody(request, adminTakedownSchema);
  if ("response" in body) return body.response;

  const supabase = createServiceClient();
  const { data: message } = await supabase
    .from("d1_messages")
    .select("id, group_id, deleted_at, group:d1_groups(name), sender:d1_members!d1_messages_sender_id_fkey(display_name)")
    .eq("id", messageId)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.rpc("d1_admin_delete_message", { p_message: messageId, p_admin: admin.userId });
  if (error) return dbFailure(error);

  const groupName = (message.group as unknown as { name: string } | null)?.name ?? "a group";
  const senderName = (message.sender as unknown as { display_name: string } | null)?.display_name ?? "Former member";
  await recordAudit({
    action: "moderate",
    section: "safeguarding",
    entity: "chat message",
    entityId: String(messageId),
    entityLabel: groupName,
    summary: `Removed a message from ${senderName} in the Destiny One group "${groupName}"`,
    metadata: { reason: body.data.reason, groupId: message.group_id, alreadyDeleted: Boolean(message.deleted_at) },
  });
  return NextResponse.json({ ok: true });
}
