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
  contentPreview,
  isAdult,
  isLeaderRole,
  topRole,
  type D1CommunitySummary,
  type D1GroupDetail,
  type D1GroupKind,
  type D1GroupState,
  type D1GroupSummary,
  type D1LinkPreview,
  type D1LeaderRole,
  type D1Message,
  type D1MessageContent,
  type D1MessagePage,
  type D1MembershipRole,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { OneError, fromDbError } from "@/lib/destinyOne/http";
import { avatarUrl, type Caller } from "@/lib/destinyOne/auth.server";
import { openBody, openContent, UNREADABLE } from "@/lib/destinyOne/crypto.server";

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
  /** Not from the SQL: filled in by overview() for a last message that is only a poll or an event. */
  last_content?: D1MessageContent | null;
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
    iconUrl: null,
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
            preview: preview(openBody(row.last_body, row.group_id)) ?? preview(contentPreview(openContent(row.last_content, row.group_id))),
            hasAttachment: Boolean(row.last_has_attachment),
            deleted: Boolean(row.last_deleted),
            createdAt: row.last_created_at as string,
          },
  };
}

/** Signed links for the groups that have an icon, keyed by group id. */
async function iconUrls(groupIds: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (!groupIds.length) return urls;
  const { data } = await createServiceClient().from("d1_groups").select("id, icon_path").in("id", groupIds).not("icon_path", "is", null);
  await Promise.all(
    (data ?? []).map(async (g) => {
      const url = await avatarUrl(g.icon_path as string);
      if (url) urls.set(g.id as string, url);
    }),
  );
  return urls;
}

async function overview(memberId: string, groupId?: string): Promise<OverviewRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("d1_group_overview", {
    p_member: memberId,
    p_group: groupId ?? null,
  });
  if (error) throw fromDbError(error);
  const rows = (data ?? []) as OverviewRow[];

  // A poll or a shared event has no body, so the SQL gives no preview for it.
  // Fetch just those messages' content (one query) so the chat list can say
  // "Poll: …" / "Event: …" instead of a blank line.
  const contentOnly = rows.filter((r) => r.last_id !== null && !r.last_body && !r.last_deleted && !r.last_has_attachment).map((r) => r.last_id as number);
  if (contentOnly.length) {
    const { data: messages } = await supabase.from("d1_messages").select("id, content").in("id", contentOnly);
    const contentFor = new Map((messages ?? []).map((m) => [m.id as number, m.content as D1MessageContent | null]));
    for (const r of rows) if (r.last_id !== null && contentFor.has(r.last_id)) r.last_content = contentFor.get(r.last_id);
  }
  return rows;
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
  const icons = await iconUrls(groups.map((g) => g.group_id));

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

  const senior = isLeaderRole(caller.policy.roles);

  return (memberships ?? []).map((m) => {
    const c = m.d1_communities as unknown as { id: string; name: string; description: string | null };
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      myRole: m.role as D1MembershipRole,
      canManage: senior || m.role === "admin",
      announcementsGroupId: (announcements ?? []).find((a) => a.community_id === c.id)?.id ?? null,
      groups: groups.filter((g) => g.community_id === c.id).map((g) => ({ ...toSummary(g), iconUrl: icons.get(g.group_id) ?? null })),
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
  const [{ data: members, error }, canManage, icons, pinned] = await Promise.all([
    supabase
      .from("d1_group_members")
      .select("role, joined_at, d1_members!d1_group_members_member_id_fkey!inner(id, display_name, adult_on, status, roles)")
      .eq("group_id", groupId)
      .is("left_at", null)
      .eq("d1_members.status", "active")
      .order("joined_at", { ascending: true }),
    canManageGroup(groupId, caller.member.id),
    iconUrls([groupId]),
    pinnedMessages(caller, groupId, row.joined_at),
  ]);
  if (error) throw fromDbError(error);

  const people = (members ?? []).map((m) => {
    const p = m.d1_members as unknown as { id: string; display_name: string; adult_on: string | null; roles: D1LeaderRole[] };
    return { role: m.role as D1MembershipRole, joinedAt: m.joined_at as string, ...p };
  });
  const adults = people.filter((p) => isAdult(p.adult_on)).length;

  return {
    ...toSummary(row),
    iconUrl: icons.get(groupId) ?? null,
    description: row.description,
    canManage,
    canPost: canPost({ member: caller.policy, groupKind: row.kind, groupState: row.state, myRole: row.my_role }),
    pinned,
    members: people.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      role: p.role,
      tag: topRole(p.roles),
      joinedAt: p.joinedAt,
      ...(canManage ? { isAdult: isAdult(p.adult_on) } : {}),
    })),
    ...(canManage
      ? { rules: { members: people.length, adults, minMembers: MIN_GROUP_MEMBERS, minAdults: MIN_GROUP_ADULTS } }
      : {}),
  };
}

/**
 * Tells everyone in the group that its name, description or icon changed, so
 * their chat lists update now rather than on their next catch-up. Best-effort:
 * the change itself has already been saved.
 */
export async function announceGroupUpdated(groupId: string): Promise<void> {
  const { error } = await createServiceClient().rpc("d1_emit", {
    topic: `d1-group:${groupId}`,
    event: "group_updated",
    payload: { groupId },
  });
  if (error) console.error("⚠️ Destiny One group_updated broadcast failed:", error.message);
}

/**
 * Sends a new message to everyone in the group over Realtime's REST broadcast.
 * Not d1_emit: a broadcast from the database is stored in realtime.messages
 * for three days, and this payload carries the opened (plaintext) message.
 * The REST path delivers it without writing it anywhere. Best-effort: anyone
 * who misses it gets the message on their next catch-up.
 */
export async function broadcastNewMessage(message: D1Message): Promise<void> {
  await broadcastToGroup(message.groupId, "message", {
    id: message.id,
    groupId: message.groupId,
    sender: message.sender,
    body: message.body,
    replyTo: message.replyTo,
    attachmentId: message.attachment?.id ?? null,
    content: message.content,
    mentions: message.mentions,
    createdAt: message.createdAt,
  });
}

/** An edited message's new text, to everyone in the group. Same REST path as new messages (it carries plaintext). */
export async function broadcastMessageEdited(message: D1Message): Promise<void> {
  if (!message.body || !message.editedAt) return;
  await broadcastToGroup(message.groupId, "message_edited", { id: message.id, groupId: message.groupId, body: message.body, editedAt: message.editedAt, mentions: message.mentions });
}

/**
 * One event on d1-group:<id> through Realtime's REST broadcast, which stores
 * nothing (d1_emit from SQL keeps a copy in realtime.messages for three days).
 * Use this for anything that carries message text. Best-effort.
 */
export async function broadcastToGroup(groupId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: `d1-group:${groupId}`, event, payload, private: true }] }),
    });
    if (!res.ok) console.error(`⚠️ Destiny One ${event} broadcast failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`⚠️ Destiny One ${event} broadcast failed:`, (err as Error).message);
  }
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
  content: D1MessageContent | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  mentions: string[] | null;
  link_preview: string | null;
  sender: { id: string; display_name: string } | null;
  attachment: { id: string; storage_path: string; mime_type: string; size_bytes: number | null } | null;
}

const MESSAGE_SELECT =
  "id, group_id, sender_id, body, reply_to, attachment_id, content, created_at, edited_at, deleted_at, mentions, link_preview, " +
  "sender:d1_members!d1_messages_sender_id_fkey(id, display_name), " +
  "attachment:d1_attachments!d1_messages_attachment_id_fkey(id, storage_path, mime_type, size_bytes)";

/** A stored (sealed) link preview, opened. A bad one is dropped rather than breaking the chat. */
function openLinkPreview(sealed: string | null, groupId: string): D1LinkPreview | null {
  const json = openBody(sealed, groupId);
  if (!json || json === UNREADABLE) return null;
  try {
    return JSON.parse(json) as D1LinkPreview;
  } catch {
    return null;
  }
}

/** Overlays live tallies (and the caller's own choice) onto a poll's static definition. */
function livePollContent(content: D1MessageContent, messageId: number, callerId: string, votes: { message_id: number; member_id: string; option_id: string }[]): D1MessageContent {
  if (content.kind !== "poll") return content;
  const rows = votes.filter((v) => v.message_id === messageId);
  const counts = new Map<string, number>();
  for (const v of rows) counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
  return {
    kind: "poll",
    poll: {
      ...content.poll,
      totalVoters: new Set(rows.map((v) => v.member_id)).size,
      votes: content.poll.options.map((o) => ({ optionId: o.id, count: counts.get(o.id) ?? 0 })),
      myOptionIds: rows.filter((v) => v.member_id === callerId).map((v) => v.option_id),
    },
  };
}

async function shape(rows: MessageRow[], callerId: string): Promise<D1Message[]> {
  if (rows.length === 0) return [];
  const supabase = createServiceClient();
  const ids = rows.map((r) => r.id);

  const live = rows.filter((r) => !r.deleted_at && r.attachment);
  const pollIds = rows.filter((r) => !r.deleted_at && r.content?.kind === "poll").map((r) => r.id);
  const [{ data: reactions }, signed, { data: votes }] = await Promise.all([
    supabase.from("d1_reactions").select("message_id, member_id, emoji").in("message_id", ids),
    live.length
      ? supabase.storage.from(MEDIA_BUCKET).createSignedUrls(
          live.map((r) => r.attachment!.storage_path),
          SIGNED_URL_TTL,
        )
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    pollIds.length
      ? supabase.from("d1_poll_votes").select("message_id, member_id, option_id").in("message_id", pollIds)
      : Promise.resolve({ data: [] as { message_id: number; member_id: string; option_id: string }[] }),
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
      body: deleted ? null : openBody(r.body, r.group_id),
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
      content: !deleted && r.content ? livePollContent(openContent(r.content, r.group_id)!, r.id, callerId, votes ?? []) : null,
      reactions: deleted ? [] : [...byEmoji].map(([emoji, v]) => ({ emoji, ...v })),
      createdAt: r.created_at,
      editedAt: deleted ? null : r.edited_at,
      mentions: deleted ? [] : r.mentions ?? [],
      linkPreview: deleted ? null : openLinkPreview(r.link_preview, r.group_id),
      deleted,
      mine: r.sender_id === callerId,
    };
  });
}

export async function listMessages(
  caller: Caller,
  groupId: string,
  opts: { before?: number; limit: number; attachmentsOnly?: boolean },
): Promise<D1MessagePage> {
  const [membership, blocked] = await Promise.all([requireGroupMembership(caller, groupId), blockedIds(caller.member.id)]);

  let query = createServiceClient()
    .from("d1_messages")
    .select(MESSAGE_SELECT)
    .eq("group_id", groupId)
    .gte("created_at", membership.joinedAt)
    .order("id", { ascending: false })
    .limit(opts.limit + 1);
  if (opts.before) query = query.lt("id", opts.before);
  // Group info → Photos and files: only messages that still carry a file.
  if (opts.attachmentsOnly) query = query.not("attachment_id", "is", null).is("deleted_at", null);
  // People I've blocked: their messages are hidden for me (never for safeguarding).
  // (`or` keeps "Former member" messages, whose sender_id is null: NOT IN alone drops them.)
  if (blocked.length) query = query.or(`sender_id.is.null,sender_id.not.in.(${blocked.join(",")})`);

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

/**
 * The group's pinned messages the caller can see: sent since they joined, not
 * deleted, not from someone they've blocked. Newest pin first.
 */
async function pinnedMessages(caller: Caller, groupId: string, joinedAt: string): Promise<D1Message[]> {
  const supabase = createServiceClient();
  const { data: pins, error } = await supabase.from("d1_pins").select("message_id").eq("group_id", groupId).order("pinned_at", { ascending: false });
  if (error) throw fromDbError(error);
  const ids = (pins ?? []).map((p) => p.message_id as number);
  if (!ids.length) return [];
  const [{ data, error: msgError }, blocked] = await Promise.all([
    supabase.from("d1_messages").select(MESSAGE_SELECT).in("id", ids).gte("created_at", joinedAt).is("deleted_at", null),
    blockedIds(caller.member.id),
  ]);
  if (msgError) throw fromDbError(msgError);
  const rows = ((data ?? []) as unknown as MessageRow[]).filter((r) => !r.sender_id || !blocked.includes(r.sender_id));
  const shaped = await shape(rows, caller.member.id);
  return ids.map((id) => shaped.find((m) => m.id === id)).filter((m): m is D1Message => !!m);
}

/** Ids of the people this member has blocked (d1_blocks). */
export async function blockedIds(memberId: string): Promise<string[]> {
  const { data, error } = await createServiceClient().from("d1_blocks").select("blocked_id").eq("blocker_id", memberId);
  if (error) throw fromDbError(error);
  return (data ?? []).map((r) => r.blocked_id as string);
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
