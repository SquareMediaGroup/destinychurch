import { NextResponse } from "next/server";
import { isAdult } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { MEDIA_BUCKET } from "@/lib/destinyOne/chat.server";

// GET /api/admin/destiny-one/safeguarding/groups/[id]/transcript?reason=…&from=…&to=…
//
// The full record of a group for a safeguarding investigation: everyone who
// has ever been in it (with join/leave times and adult status), and every
// message in the window — deleted ones included, with their content.
//
// Reviewability must not become unsupervised browsing of people's
// conversations (docs/mobile-app-scope.md §4.5), so:
//   • a `reason` is required and goes into the audit log with who looked,
//     which group, and which time window;
//   • the window defaults to the last 30 days, so looking further back is a
//     deliberate choice that is also recorded.
// This is a GET that writes an audit entry on purpose.

export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_DAYS = 30;
const ATTACHMENT_URL_TTL = 10 * 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const groupId = (await params).id;

  const url = new URL(request.url);
  const reason = (url.searchParams.get("reason") ?? "").trim();
  if (reason.length < 5) {
    return NextResponse.json({ error: "Say why you are opening this conversation (reason, at least 5 characters)." }, { status: 400 });
  }
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to") as string) : new Date();
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from") as string)
    : new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Invalid from/to dates." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: group, error: groupError } = await supabase
    .from("d1_groups")
    .select("id, name, kind, department, state, freeze_kind, frozen_reason, created_at, community:d1_communities(id, name)")
    .eq("id", groupId)
    .maybeSingle();
  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [members, messages] = await Promise.all([
    supabase
      .from("d1_group_members")
      .select("role, joined_at, left_at, member:d1_members!d1_group_members_member_id_fkey(id, display_name, adult_on, status)")
      .eq("group_id", groupId)
      .order("joined_at"),
    supabase
      .from("d1_messages")
      .select(
        "id, body, reply_to, created_at, deleted_at, " +
          "sender:d1_members!d1_messages_sender_id_fkey(id, display_name), " +
          "deleted_by_member:d1_members!d1_messages_deleted_by_fkey(id, display_name), " +
          "attachment:d1_attachments!d1_messages_attachment_id_fkey(id, storage_path, mime_type, size_bytes)",
      )
      .eq("group_id", groupId)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("id"),
  ]);
  if (members.error || messages.error) {
    return NextResponse.json({ error: (members.error ?? messages.error)?.message }, { status: 500 });
  }

  type Row = { attachment: { storage_path: string } | null };
  const rows = (messages.data ?? []) as unknown as Row[];
  const paths = rows.map((m) => m.attachment?.storage_path).filter((p): p is string => Boolean(p));
  const signed = paths.length
    ? await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, ATTACHMENT_URL_TTL)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlFor = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));

  await recordAudit({
    action: "view",
    section: "safeguarding",
    entity: "chat transcript",
    entityId: groupId,
    entityLabel: group.name,
    summary: `Opened the Destiny One transcript for "${group.name}" (${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)})`,
    metadata: { reason, from: from.toISOString(), to: to.toISOString(), messageCount: rows.length },
  });

  return NextResponse.json({
    group,
    window: { from: from.toISOString(), to: to.toISOString() },
    members: (members.data ?? []).map((m) => {
      const p = m.member as unknown as { id: string; display_name: string; adult_on: string | null; status: string };
      return {
        id: p.id,
        displayName: p.display_name,
        isAdult: isAdult(p.adult_on),
        status: p.status,
        role: m.role,
        joinedAt: m.joined_at,
        leftAt: m.left_at,
      };
    }),
    messages: rows.map((m) => ({
      ...m,
      attachment: m.attachment ? { ...m.attachment, url: urlFor.get(m.attachment.storage_path) ?? null } : null,
    })),
  });
}
