// What the app keeps in its cache, and how database events update it.
//
//   ["me"]                 D1Me
//   ["communities"]        the chat list (every group I'm in, by community)
//   ["assistant"]          my one-to-one chat with DestinyAI (a group in no community)
//   ["community", id]      only when it isn't already in the chat list
//   ["group", id]          group details (members, rules, what I can do)
//   ["messages", groupId]  { messages, nextBefore }, oldest first
//   ["media", groupId]     Group info → Photos and files: the same shape, only messages with a file
//   ["appConfig"]          minimum builds + maintenance switch (src/lib/appGate.ts)
//   ["events"]             upcoming church events (the one entry that goes stale on a timer: the calendar changes)
//
// applyEvent() is the "database told us something changed" path. Where the
// event carries enough, it patches the cache directly (no request at all);
// otherwise it marks the affected entry stale, and that entry re-fetches in
// the background, only if something on screen is using it.

import { useQuery } from "@tanstack/react-query";
import { contentPreview, type D1CommunitySummary, type D1GroupDetail, type D1GroupSummary, type D1Me, type D1Message, type D1RealtimeEvent } from "@destiny/shared";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { typing } from "@/state/typing";

export type LocalMessage = D1Message & { status?: "sending" | "failed"; localAttachment?: { name: string; mimeType: string; sizeBytes: number | null; durationMs?: number } };
export interface MessagesData {
  messages: LocalMessage[];
  nextBefore: number | null;
}

export const keys = {
  me: ["me"] as const,
  communities: ["communities"] as const,
  assistant: ["assistant"] as const,
  community: (id: string) => ["community", id] as const,
  group: (id: string) => ["group", id] as const,
  messages: (groupId: string) => ["messages", groupId] as const,
  media: (groupId: string) => ["media", groupId] as const,
  appConfig: ["appConfig"] as const,
  events: ["events"] as const,
};

export const PAGE = 40;
/** Must match PREVIEW_LENGTH in lib/destinyOne/chat.server.ts. */
const PREVIEW_LENGTH = 140;

// ── Message list helpers ────────────────────────────────────────────────────

/** Insert or update one message. Server messages stay in id order; unsent local ones (negative ids) stay last. */
export function upsert(list: LocalMessage[], msg: LocalMessage): LocalMessage[] {
  const i = list.findIndex((m) => m.id === msg.id);
  if (i >= 0) {
    const next = list.slice();
    next[i] = { ...list[i], ...msg };
    return next;
  }
  if (msg.id < 0) return [...list, msg];
  const server = list.filter((m) => m.id > 0);
  const local = list.filter((m) => m.id < 0);
  const at = server.findIndex((m) => m.id > msg.id);
  if (at >= 0) server.splice(at, 0, msg);
  else server.push(msg);
  return [...server, ...local];
}

/**
 * Fold the newest page into what we already have. If the page doesn't reach
 * back to anything cached (lots happened while we were away), the old copy
 * is dropped rather than leaving a silent gap in the conversation.
 */
function mergeLatest(prev: MessagesData | undefined, page: { messages: D1Message[]; nextBefore: number | null }): MessagesData {
  const local = (prev?.messages ?? []).filter((m) => m.id < 0);
  const cached = (prev?.messages ?? []).filter((m) => m.id > 0);
  const overlaps = page.nextBefore === null || page.messages.some((m) => cached.some((c) => c.id === m.id));
  if (!prev || !overlaps) return { messages: [...page.messages, ...local], nextBefore: page.nextBefore };
  let messages = prev.messages;
  for (const m of page.messages) messages = upsert(messages, m);
  return { messages, nextBefore: prev.nextBefore };
}

export async function fetchLatestMessages(groupId: string): Promise<MessagesData> {
  const page = await api.messages(groupId, { limit: PAGE });
  return mergeLatest(queryClient.getQueryData<MessagesData>(keys.messages(groupId)), page);
}

/** Change a group's cached messages (no-op if that chat has never been opened). */
export function updateMessages(groupId: string, fn: (list: LocalMessage[]) => LocalMessage[]) {
  queryClient.setQueryData<MessagesData>(keys.messages(groupId), (old) => (old ? { ...old, messages: fn(old.messages) } : old));
}

// ── Chat list helpers ───────────────────────────────────────────────────────

/** Change one group's row in the chat list (and the community page copy, if any). */
export function updateGroupSummary(groupId: string, fn: (g: D1GroupSummary) => D1GroupSummary) {
  const patch = (c: D1CommunitySummary): D1CommunitySummary =>
    c.groups.some((g) => g.id === groupId) ? { ...c, groups: c.groups.map((g) => (g.id === groupId ? fn(g) : g)) } : c;
  queryClient.setQueryData<D1CommunitySummary[]>(keys.communities, (old) => old?.map(patch));
  queryClient.setQueryData<D1GroupSummary>(keys.assistant, (old) => (old && old.id === groupId ? fn(old) : old));
  queryClient.setQueriesData<D1CommunitySummary>({ queryKey: ["community"] }, (old) => (old ? patch(old) : old));
}

/** Drop a group from the chat list at once (leaving it), without waiting for the server. */
export function removeGroupLocally(groupId: string) {
  queryClient.setQueryData<D1CommunitySummary[]>(keys.communities, (old) => old?.map((c) => ({ ...c, groups: c.groups.filter((g) => g.id !== groupId) })));
  queryClient.removeQueries({ queryKey: keys.group(groupId) });
  queryClient.removeQueries({ queryKey: keys.messages(groupId) });
  queryClient.removeQueries({ queryKey: keys.media(groupId) });
}

// ── Blocking ────────────────────────────────────────────────────────────────

function isBlocked(memberId: string | undefined): boolean {
  if (!memberId) return false;
  return !!queryClient.getQueryData<D1Me>(keys.me)?.blocked?.some((b) => b.id === memberId);
}

/** Just blocked someone: take their messages out of every cached chat at once. */
export function hideSender(memberId: string) {
  for (const key of ["messages", "media"]) {
    queryClient.setQueriesData<MessagesData>({ queryKey: [key] }, (old) =>
      old ? { ...old, messages: old.messages.filter((m) => m.sender?.id !== memberId) } : old,
    );
  }
  invalidateCommunities(); // previews and unread counts come back without them
}

/** Unblocked someone: start every chat afresh so their messages come back in place. */
export function showSendersAgain() {
  void queryClient.resetQueries({ queryKey: ["messages"] });
  void queryClient.resetQueries({ queryKey: ["media"] });
  invalidateCommunities();
}

/** Refresh the chat list in the background. Never awaited by the UI. */
export function invalidateCommunities() {
  void queryClient.invalidateQueries({ queryKey: keys.communities });
  void queryClient.invalidateQueries({ queryKey: ["community"] });
  void queryClient.invalidateQueries({ queryKey: keys.assistant });
}

function previewOf(body: string | null): string | null {
  if (!body) return null;
  const first = body.split("\n", 1)[0].trim();
  return first.length > PREVIEW_LENGTH ? `${first.slice(0, PREVIEW_LENGTH - 1)}…` : first;
}

// ── The chat that's on screen ───────────────────────────────────────────────

let openGroupId: string | null = null;
/** The chat on screen right now, if any. */
export function currentOpenGroup(): string | null {
  return openGroupId;
}
/** The chat screen calls this on focus / blur, so messages there don't count as unread. */
export function setOpenGroup(groupId: string | null) {
  openGroupId = groupId;
  if (groupId) updateGroupSummary(groupId, (g) => (g.unreadCount ? { ...g, unreadCount: 0 } : g));
}

// ── Realtime → cache ────────────────────────────────────────────────────────

export function applyEvent(e: D1RealtimeEvent, meId: string) {
  switch (e.event) {
    case "message": {
      const p = e.payload;
      if (isBlocked(p.sender.id)) return; // someone I've blocked: never shown, never unread
      const mine = p.sender.id === meId;
      typing.stopped(p.groupId, p.sender.id);
      if (p.attachmentId) {
        // The event has no signed URL; the page fetch brings one.
        void queryClient.invalidateQueries({ queryKey: keys.messages(p.groupId) });
        void queryClient.invalidateQueries({ queryKey: keys.media(p.groupId) });
      } else {
        updateMessages(p.groupId, (list) =>
          upsert(list, { id: p.id, groupId: p.groupId, sender: p.sender, body: p.body, replyTo: p.replyTo, attachment: null, content: p.content ?? null, reactions: [], createdAt: p.createdAt, editedAt: null, mentions: p.mentions ?? [], linkPreview: null, forwarded: !!p.forwarded, deleted: false, mine }),
        );
      }
      updateGroupSummary(p.groupId, (g) => {
        if (g.lastMessage && g.lastMessage.id >= p.id) return g; // already have it (or newer)
        return {
          ...g,
          unreadCount: mine || openGroupId === p.groupId ? g.unreadCount : g.unreadCount + 1,
          lastMessage: { id: p.id, senderName: p.sender.displayName, preview: previewOf(p.body) ?? previewOf(contentPreview(p.content)), hasAttachment: !!p.attachmentId, deleted: false, createdAt: p.createdAt },
        };
      });
      return;
    }
    case "message_deleted": {
      const { id, groupId } = e.payload;
      updateMessages(groupId, (list) => list.map((m) => (m.id === id ? { ...m, deleted: true, body: null, attachment: null, content: null, reactions: [] } : m)));
      queryClient.setQueryData<D1GroupDetail>(keys.group(groupId), (g) => (g?.pinned?.some((p) => p.id === id) ? { ...g, pinned: g.pinned.filter((p) => p.id !== id) } : g));
      queryClient.setQueryData<MessagesData>(keys.media(groupId), (old) => (old ? { ...old, messages: old.messages.filter((m) => m.id !== id) } : old));
      updateGroupSummary(groupId, (g) => (g.lastMessage?.id === id ? { ...g, lastMessage: { ...g.lastMessage, deleted: true, preview: null } } : g));
      return;
    }
    case "message_edited": {
      const { id, groupId, body, editedAt, mentions } = e.payload;
      updateMessages(groupId, (list) => list.map((m) => (m.id === id ? { ...m, body, editedAt, mentions: mentions ?? m.mentions } : m)));
      queryClient.setQueryData<D1GroupDetail>(keys.group(groupId), (g) =>
        g?.pinned?.some((p) => p.id === id) ? { ...g, pinned: g.pinned.map((p) => (p.id === id ? { ...p, body, editedAt, mentions: mentions ?? p.mentions } : p)) } : g,
      );
      updateGroupSummary(groupId, (g) => (g.lastMessage?.id === id ? { ...g, lastMessage: { ...g.lastMessage, preview: previewOf(body) } } : g));
      return;
    }
    case "poll_vote": {
      const { messageId, groupId, votes, totalVoters } = e.payload;
      updateMessages(groupId, (list) =>
        list.map((m) => {
          if (m.id !== messageId || m.content?.kind !== "poll") return m;
          return { ...m, content: { kind: "poll", poll: { ...m.content.poll, votes, totalVoters } } };
        }),
      );
      return;
    }
    case "reaction": {
      const { messageId, groupId, memberId, emoji, added } = e.payload;
      if (memberId === meId) return; // already applied locally
      updateMessages(groupId, (list) =>
        list.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          let reactions = m.reactions;
          if (existing) reactions = m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + (added ? 1 : -1) } : r));
          else if (added) reactions = [...m.reactions, { emoji, count: 1, mine: false }];
          return { ...m, reactions: reactions.filter((r) => r.count > 0) };
        }),
      );
      return;
    }
    case "group_state": {
      const { groupId, state, reason } = e.payload;
      if (state === "archived") invalidateCommunities(); // archived groups leave the chat list
      else updateGroupSummary(groupId, (g) => ({ ...g, state, frozenReason: state === "frozen" ? reason : null }));
      void queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
      return;
    }
    case "link_preview": {
      const { id, groupId, preview } = e.payload;
      updateMessages(groupId, (list) => list.map((m) => (m.id === id ? { ...m, linkPreview: preview } : m)));
      return;
    }
    case "typing": {
      const { groupId, memberId, name } = e.payload;
      if (memberId !== meId && !isBlocked(memberId)) typing.seen(groupId, memberId, name);
      return;
    }
    case "pins_changed":
    case "members_changed":
      void queryClient.invalidateQueries({ queryKey: keys.group(e.payload.groupId) });
      return;
    case "group_updated":
      // Renamed, re-described or a new icon (signed icon links only come with a fetch).
      void queryClient.invalidateQueries({ queryKey: keys.group(e.payload.groupId) });
      invalidateCommunities();
      return;
    case "group_left":
      removeGroupLocally(e.payload.groupId);
      invalidateCommunities();
      return;
    case "group_joined":
    case "community_left":
      invalidateCommunities();
      return;
    case "blocks_changed": {
      // Usually our own block from this phone (already applied); this keeps
      // other phones signed in to the same account in step.
      const { memberId, blocked } = e.payload;
      void queryClient.invalidateQueries({ queryKey: keys.me });
      if (blocked) hideSender(memberId);
      else showSendersAgain();
      return;
    }
  }
}

// ── Hooks ───────────────────────────────────────────────────────────────────

export function useGroup(id: string | undefined) {
  return useQuery({ queryKey: keys.group(id ?? ""), queryFn: () => api.group(id!), enabled: !!id });
}

export function useMessages(groupId: string) {
  return useQuery({ queryKey: keys.messages(groupId), queryFn: () => fetchLatestMessages(groupId), enabled: !!groupId });
}

/** Group info → Photos and files (newest page; older pages are added by the screen). `fetch: false` only reads the cache. */
export function useGroupMedia(groupId: string, opts: { fetch?: boolean } = {}) {
  return useQuery({ queryKey: keys.media(groupId), queryFn: () => api.groupMedia(groupId, { limit: 60 }), enabled: !!groupId && opts.fetch !== false });
}

/** Upcoming church events, refreshed after half an hour (the calendar isn't on Realtime). */
export function useEvents() {
  return useQuery({ queryKey: keys.events, queryFn: () => api.events(), staleTime: 30 * 60_000 });
}

/** A community page: straight from the chat list when it's there (it's the same data), otherwise fetched. */
export function useCommunity(id: string) {
  const fromList = useQuery({
    queryKey: keys.communities,
    queryFn: () => api.communities(),
    enabled: false,
    select: (list) => list.find((c) => c.id === id) ?? null,
  }).data;
  const fetched = useQuery({ queryKey: keys.community(id), queryFn: () => api.community(id), enabled: !!id && !fromList });
  return { data: fromList ?? fetched.data ?? null, error: fromList ? null : fetched.error, refetch: fetched.refetch };
}

/** Start loading a chat the moment a finger touches its row. Free if it's already cached. */
export function prefetchGroup(groupId: string) {
  void queryClient.prefetchQuery({ queryKey: keys.group(groupId), queryFn: () => api.group(groupId) });
  void queryClient.prefetchQuery({ queryKey: keys.messages(groupId), queryFn: () => fetchLatestMessages(groupId) });
}

/** Seed the group cache after an edit so the next screen shows the new copy without a fetch. */
export function setGroup(group: D1GroupDetail) {
  queryClient.setQueryData(keys.group(group.id), group);
}
