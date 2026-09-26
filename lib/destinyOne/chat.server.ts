// Destiny One — reads for the chat API, shaped into the wire types in
// @destiny/shared. Writes go through the d1_* SQL functions directly from the
// routes (via `rpc`), because that is where the rules are enforced.
//
// Visibility rules applied here:
//   • You only see groups you are currently in. Senior leadership doesn't get
//     a back door into group content; review is a separate, audited admin
//     path (/api/admin/destiny-one).
//   • You only see messages from after you joined (the WhatsApp behaviour, and
//     data minimisation: a new member doesn't inherit years of history).
//   • Deleted messages come back as a stub with no body.
//   • Whether someone is an adult is shown only to people who manage the
//     group, who need it to keep the 2-adult rule.

import "server-only";
import {
  MIN_GROUP_ADULTS,
  MIN_GROUP_MEMBERS,
  canPost,
  isAdult,
  type D1CommunitySummary,
  type D1GroupDetail,
  type D1GroupKind,
  type D1GroupState,
  type D1GroupSummary,
  type D1Message,
  type D1MessagePage,
  type D1MembershipRole,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { OneError, fromDbError } from "@/lib/destinyOne/http";
import type { Caller } from "@/lib/destinyOne/auth.server";

export const MEDIA_BUCKET = "d1-chat-media";
const SIGNED_URL_TTL = 60 * 60;
const PREVIEW_LENGTH = 140;

interface OverviewRow {
  group_id: string;
  community_id: string;
  kind: D1GroupKind;
  name: string;
  department: string | null;
  description: string | null;
  state: D1GroupState;
  frozen_reason: string | null;
  my_role: D1MembershipRole;
  joined_at: string;
  muted_until: string | null;
  unread_count: number;
  last_id: number | null;
  last_sender: string | null;
  last_body: string | null;
  last_has_attachment: boolean | null;
  last_deleted: boolean | null;
  last_created_at: string | null;
}

function preview(body: string | null): string | null {
  if (!body) return null;
  const firstLine = body.split("\n", 1)[0].trim();
  return firstLine.length > PREVIEW_LENGTH ? `${firstLine.slice(0, PREVIEW_LENGTH - 1)}…` : firstLine;
}

function toSummary(row: OverviewRow): D1GroupSummary {
  return {
    id: row.group_id,
    communityId: row.community_id,
    kind: row.kind,
    name: row.name,
    department: row.department,
    state: row.state,
    frozenReason: row.state === "frozen" ? row.frozen_reason : null,
    myRole: row.my_role,
    unreadCount: row.unread_count,
    muted: Boolean(row.muted_until && row.muted_until > new Date().toISOString()),
    lastMessage:
      row.last_id === null
        ? null
        : {
            id: row.last_id,
            senderName: row.last_sender,
            preview: preview(row.last_body),
            hasAttachment: Boolean(row.last_has_attachment),
            deleted: Boolean(row.last_deleted),
            createdAt: row.last_created_at as string,
          },
  };
}

async function overview(memberId: string, groupId?: string): Promise<OverviewRow[]> {
  const { data, error } = await createServiceClient().rpc("d1_group_overview", {
    p_member: memberId,
    p_group: groupId ?? null,
  });
  if (error) throw fromDbError(error);
  return (data ?? []) as OverviewRow[];
}

async function rpcBool(fn: string, args: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc(fn, args);
  if (error) throw fromDbError(error);
  return data === true;
}

export function canManageGroup(groupId: string, memberId: string) {
  return rpcBool("d1_can_manage_group", { p_group: groupId, p_member: memberId });
}

export function canManageCommunity(communityId: string, memberId: string) {
  return rpcBool("d1_can_manage_community", { p_community: communityId, p_member: memberId });
}

// ── Communities ─────────────────────────────────────────────────────────────

export async function listCommunities(caller: Caller, onlyId?: string): Promise<D1CommunitySummary[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("d1_community_members")
    .select("role, d1_communities!inner(id, name, description, archived_at, created_at)")
    .eq("member_id", caller.member.id)
    .is("d1_communities.archived_at", null);
  if (onlyId) query = query.eq("community_id", onlyId);

  const [{ data: memberships, error }, groups] = await Promise.all([query, overview(caller.member.id)]);
  if (error) throw fromDbError(error);

  const communityIds = (memberships ?? []).map(
    (m) => (m.d1_communities as unknown as { id: string }).id,
  );
  const { data: announcements } = communityIds.length
    ? await supabase
        .from("d1_groups")
        .select("id, community_id")
        .eq("kind", "announcements")
        .in("community_id", communityIds)
    : { data: [] };

  const senior = caller.policy.roles.includes("senior_leadership");

  return (memberships ?? []).map((m) => {
    const c = m.d1_communities as unknown as { id: string; name: string; description: string | null };
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      myRole: m.role as D1MembershipRole,
      canManage: senior || m.role === "admin",
      announcementsGroupId: (announcements ?? []).find((a) => a.community_id === c.id)?.id ?? null,
      groups: groups.filter((g) => g.community_id === c.id).map(toSummary),
    };
  });
}

export async function getCommunity(caller: Caller, communityId: string): Promise<D1CommunitySummary> {
  const [community] = await listCommunities(caller, communityId);
  if (!community) throw new OneError("not_found", "That community doesn't exist, or you're not in it.");
  return community;
}

// ── Groups ──────────────────────────────────────────────────────────────────

export async function getGroup(caller: Caller, groupId: string): Promise<D1GroupDetail> {
  const [row] = await overview(caller.member.id, groupId);
  if (!row) throw new OneError("not_found", "That group doesn't exist, or you're not in it.");

  const supabase = createServiceClient();
  const [{ data: members, error }, canManage] = await Promise.all([
    supabase
      .from("d1_group_members")
      .select("role, joined_at, d1_members!inner(id, display_name, adult_on, status)")
      .eq("group_id", groupId)
      .is("left_at", null)
      .eq("d1_members.status", "active")
      .order("joined_at", { ascending: true }),
    canManageGroup(groupId, caller.member.id),
  ]);
  if (error) throw fromDbError(error);

  const people = (members ?? []).map((m) => {
    const p = m.d1_members as unknown as { id: string; display_name: string; adult_on: string | null };
    return { role: m.role as D1MembershipRole, joinedAt: m.joined_at as string, ...p };
  });
  const adults = people.filter((p) => isAdult(p.adult_on)).length;

  return {
    ...toSummary(row),
    description: row.description,
    canManage,
    canPost: canPost({ member: caller.policy, groupKind: row.kind, groupState: row.state, myRole: row.my_role }),
    members: people.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      role: p.role,
      joinedAt: p.joinedAt,
      ...(canManage ? { isAdult: isAdult(p.adult_on) } : {}),
    })),
    ...(canManage
      ? { rules: { members: people.length, adults, minMembers: MIN_GROUP_MEMBERS, minAdults: MIN_GROUP_ADULTS } }
      : {}),
  };
}

/** The caller's live membership row, or not_found. Used before any group read or write. */
export async function requireGroupMembership(caller: Caller, groupId: string) {
  const { data, error } = await createServiceClient()
    .from("d1_group_members")
    .select("role, joined_at, d1_groups!inner(kind, state)")
    .eq("group_id", groupId)
    .eq("member_id", caller.member.id)
    .is("left_at", null)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw new OneError("not_found", "That group doesn't exist, or you're not in it.");
  const g = data.d1_groups as unknown as { kind: D1GroupKind; state: D1GroupState };
  return { role: data.role as D1MembershipRole, joinedAt: data.joined_at as string, kind: g.kind, state: g.state };
}

// ── Messages ────────────────────────────────────────────────────────────────

interface MessageRow {
  id: number;
  group_id: string;
  sender_id: string | null;
  body: string | null;
  reply_to: number | null;
  attachment_id: string | null;
  created_at: string;
  deleted_at: string | null;
  sender: { id: string; display_name: string } | null;
  attachment: { id: string; storage_path: string; mime_type: string; size_bytes: number | null } | null;
}

const MESSAGE_SELECT =
  "id, group_id, sender_id, body, reply_to, attachment_id, created_at, deleted_at, " +
  "sender:d1_members!d1_messages_sender_id_fkey(id, display_name), " +
  "attachment:d1_attachments!d1_messages_attachment_id_fkey(id, storage_path, mime_type, size_bytes)";

async function shape(rows: MessageRow[], callerId: string): Promise<D1Message[]> {
  if (rows.length === 0) return [];
  const supabase = createServiceClient();
  const ids = rows.map((r) => r.id);

  const live = rows.filter((r) => !r.deleted_at && r.attachment);
  const [{ data: reactions }, signed] = await Promise.all([
    supabase.from("d1_reactions").select("message_id, member_id, emoji").in("message_id", ids),
    live.length
      ? supabase.storage.from(MEDIA_BUCKET).createSignedUrls(
          live.map((r) => r.attachment!.storage_path),
          SIGNED_URL_TTL,
        )
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
  ]);

  const urlFor = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));

  return rows.map((r) => {
    const mine = (reactions ?? []).filter((x) => x.message_id === r.id);
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const x of mine) {
      const cur = byEmoji.get(x.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      cur.mine ||= x.member_id === callerId;
      byEmoji.set(x.emoji, cur);
    }
    const deleted = Boolean(r.deleted_at);
    return {
      id: r.id,
      groupId: r.group_id,
      sender: r.sender ? { id: r.sender.id, displayName: r.sender.display_name } : null,
      body: deleted ? null : r.body,
      replyTo: r.reply_to,
      attachment:
        !deleted && r.attachment
          ? {
              id: r.attachment.id,
              mimeType: r.attachment.mime_type,
              sizeBytes: r.attachment.size_bytes,
              url: urlFor.get(r.attachment.storage_path) ?? null,
            }
          : null,
      reactions: deleted ? [] : [...byEmoji].map(([emoji, v]) => ({ emoji, ...v })),
      createdAt: r.created_at,
      deleted,
      mine: r.sender_id === callerId,
    };
  });
}

export async function listMessages(
  caller: Caller,
  groupId: string,
  opts: { before?: number; limit: number },
): Promise<D1MessagePage> {
  const membership = await requireGroupMembership(caller, groupId);

  let query = createServiceClient()
    .from("d1_messages")
    .select(MESSAGE_SELECT)
    .eq("group_id", groupId)
    .gte("created_at", membership.joinedAt)
    .order("id", { ascending: false })
    .limit(opts.limit + 1);
  if (opts.before) query = query.lt("id", opts.before);

  const { data, error } = await query;
  if (error) throw fromDbError(error);

  const rows = (data ?? []) as unknown as MessageRow[];
  const hasMore = rows.length > opts.limit;
  const page = rows.slice(0, opts.limit);
  return {
    messages: (await shape(page, caller.member.id)).reverse(),
    nextBefore: hasMore ? page[page.length - 1].id : null,
  };
}

export async function getMessage(caller: Caller, messageId: number): Promise<D1Message> {
  const { data, error } = await createServiceClient()
    .from("d1_messages")
    .select(MESSAGE_SELECT)
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw new OneError("not_found", "That message doesn't exist.");
  const [message] = await shape([data as unknown as MessageRow], caller.member.id);
  return message;
}
