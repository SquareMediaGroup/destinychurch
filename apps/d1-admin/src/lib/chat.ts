// Chat data: react-query hooks over the app API, kept live by Realtime.
// A trimmed port of apps/destiny-one/src/lib/queries.ts.

import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";
import { DESTINY_AI_ID, type D1CommunitySummary, type D1GroupSummary, type D1Message, type D1MessagePage, type D1RealtimeEvent } from "@destiny/shared";
import { api } from "@/lib/api";
import { clearAssistantStream, setAssistantStatus, setAssistantText } from "@/lib/assistantStream";
import { queryClient } from "@/lib/queryClient";

export const keys = {
  communities: ["communities"] as const,
  assistant: ["assistant"] as const,
  group: (id: string) => ["group", id] as const,
  messages: (id: string) => ["messages", id] as const,
  search: (q: string) => ["search", q] as const,
};

export function useCommunities() {
  return useQuery({ queryKey: keys.communities, queryFn: () => api.communities() });
}

/** My one-to-one chat with DestinyAI. It belongs to no community, so it isn't in the communities list. */
export function useAssistant() {
  return useQuery({ queryKey: keys.assistant, queryFn: () => api.assistant(), staleTime: 60_000 });
}

export function useGroup(id: string | null) {
  return useQuery({ queryKey: keys.group(id ?? ""), queryFn: () => api.group(id!), enabled: !!id });
}

type Pages = InfiniteData<D1MessagePage, number | undefined>;

export function useMessages(groupId: string | null) {
  return useInfiniteQuery({
    queryKey: keys.messages(groupId ?? ""),
    queryFn: ({ pageParam }) => api.messages(groupId!, { before: pageParam, limit: 50 }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    enabled: !!groupId,
  });
}

/** Oldest first, deduplicated across pages. */
export function flattenMessages(data: InfiniteData<D1MessagePage, unknown> | undefined): D1Message[] {
  if (!data) return [];
  const byId = new Map<number, D1Message>();
  for (const page of data.pages) for (const m of page.messages) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function useSearch(q: string) {
  return useQuery({ queryKey: keys.search(q), queryFn: () => api.searchMessages(q), enabled: q.trim().length >= 2 });
}

export function allGroups(communities: D1CommunitySummary[] | undefined): D1GroupSummary[] {
  return (communities ?? []).flatMap((c) => c.groups);
}

/** The sidebar's order within a community: announcements first, then the most recent message. */
export function sortGroups(groups: D1GroupSummary[]): D1GroupSummary[] {
  return [...groups].sort((a, b) => (a.kind === "announcements" ? -1 : b.kind === "announcements" ? 1 : (b.lastMessage?.id ?? 0) - (a.lastMessage?.id ?? 0)));
}

/** Every group in the order the sidebar shows them (archived ones left out); Cmd-1 to Cmd-9 index into this. */
export function orderedGroups(communities: D1CommunitySummary[] | undefined): D1GroupSummary[] {
  return (communities ?? []).flatMap((c) => sortGroups(c.groups.filter((g) => !g.archived)));
}

export function findGroup(communities: D1CommunitySummary[] | undefined, id: string) {
  for (const c of communities ?? []) {
    const g = c.groups.find((x) => x.id === id);
    if (g) return { group: g, community: c };
  }
  return null;
}

// ── Cache updates ───────────────────────────────────────────────────────────

export function updateMessages(groupId: string, fn: (list: D1Message[]) => D1Message[]) {
  queryClient.setQueryData<Pages>(keys.messages(groupId), (old) => {
    if (!old) return old;
    // Newest page is first; new messages land there.
    const [first, ...rest] = old.pages;
    const all = fn(flattenMessages(old));
    const olderIds = new Set(rest.flatMap((p) => p.messages.map((m) => m.id)));
    return {
      ...old,
      pages: [
        { ...first, messages: all.filter((m) => !olderIds.has(m.id)).reverse() },
        ...rest.map((p) => ({ ...p, messages: p.messages.map((m) => all.find((x) => x.id === m.id) ?? m) })),
      ],
    };
  });
}

function updateGroupSummary(groupId: string, fn: (g: D1GroupSummary) => D1GroupSummary) {
  queryClient.setQueryData<D1CommunitySummary[]>(keys.communities, (old) =>
    old?.map((c) => ({ ...c, groups: c.groups.map((g) => (g.id === groupId ? fn(g) : g)) })),
  );
  queryClient.setQueryData<D1GroupSummary>(keys.assistant, (old) => (old && old.id === groupId ? fn(old) : old));
}

let openGroupId: string | null = null;
export function setOpenGroup(id: string | null) {
  openGroupId = id;
  if (id) updateGroupSummary(id, (g) => (g.unreadCount ? { ...g, unreadCount: 0 } : g));
}
export function currentOpenGroup() {
  return openGroupId;
}

export function invalidateCommunities() {
  void queryClient.invalidateQueries({ queryKey: keys.communities });
  void queryClient.invalidateQueries({ queryKey: keys.assistant });
}

function preview(body: string | null): string | null {
  if (!body) return null;
  const first = body.split("\n", 1)[0].trim();
  return first.length > 80 ? `${first.slice(0, 79)}…` : first;
}

export function applyEvent(e: D1RealtimeEvent, meId: string) {
  switch (e.event) {
    case "message": {
      const p = e.payload;
      // DestinyAI's finished answer replaces the live bubble it was writing.
      if (p.sender.id === DESTINY_AI_ID) clearAssistantStream(p.groupId);
      const mine = p.sender.id === meId;
      if (p.attachmentId) {
        void queryClient.invalidateQueries({ queryKey: keys.messages(p.groupId) });
      } else {
        updateMessages(p.groupId, (list) =>
          list.some((m) => m.id === p.id)
            ? list
            : [
                ...list,
                {
                  id: p.id, groupId: p.groupId, sender: p.sender, body: p.body, replyTo: p.replyTo, attachment: null,
                  content: p.content ?? null, reactions: [], createdAt: p.createdAt, editedAt: null, mentions: p.mentions ?? [],
                  linkPreview: null, forwarded: !!p.forwarded, deleted: false, mine,
                },
              ],
        );
      }
      updateGroupSummary(p.groupId, (g) => {
        if (g.lastMessage && g.lastMessage.id >= p.id) return g;
        return {
          ...g,
          unreadCount: mine || openGroupId === p.groupId ? g.unreadCount : g.unreadCount + 1,
          lastMessage: { id: p.id, senderName: p.sender.displayName, preview: preview(p.body), hasAttachment: !!p.attachmentId, deleted: false, createdAt: p.createdAt },
        };
      });
      return;
    }
    case "message_deleted": {
      const { id, groupId } = e.payload;
      updateMessages(groupId, (list) => list.map((m) => (m.id === id ? { ...m, deleted: true, body: null, attachment: null, content: null, reactions: [] } : m)));
      updateGroupSummary(groupId, (g) => (g.lastMessage?.id === id ? { ...g, lastMessage: { ...g.lastMessage, deleted: true, preview: null } } : g));
      return;
    }
    case "message_edited": {
      const { id, groupId, body, editedAt, mentions } = e.payload;
      updateMessages(groupId, (list) => list.map((m) => (m.id === id ? { ...m, body, editedAt, mentions: mentions ?? m.mentions } : m)));
      updateGroupSummary(groupId, (g) => (g.lastMessage?.id === id ? { ...g, lastMessage: { ...g.lastMessage, preview: preview(body) } } : g));
      return;
    }
    case "poll_vote": {
      const { messageId, groupId, votes, totalVoters } = e.payload;
      updateMessages(groupId, (list) =>
        list.map((m) => (m.id !== messageId || m.content?.kind !== "poll" ? m : { ...m, content: { ...m.content, poll: { ...m.content.poll, votes, totalVoters } } })),
      );
      return;
    }
    case "reaction": {
      const { messageId, groupId, memberId, emoji, added } = e.payload;
      if (memberId === meId) return; // applied locally already
      updateMessages(groupId, (list) =>
        list.map((m) => {
          if (m.id !== messageId) return m;
          const has = m.reactions.find((r) => r.emoji === emoji);
          let reactions = m.reactions;
          if (has) reactions = m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + (added ? 1 : -1) } : r));
          else if (added) reactions = [...m.reactions, { emoji, count: 1, mine: false }];
          return { ...m, reactions: reactions.filter((r) => r.count > 0) };
        }),
      );
      return;
    }
    case "assistant_status":
      setAssistantStatus(e.payload.groupId, e.payload.label);
      return;
    case "assistant_delta":
      setAssistantText(e.payload.groupId, e.payload.text);
      return;
    case "link_preview": {
      const { id, groupId, preview: lp } = e.payload;
      updateMessages(groupId, (list) => list.map((m) => (m.id === id ? { ...m, linkPreview: lp } : m)));
      return;
    }
    case "group_state": {
      const { groupId, state, reason } = e.payload;
      if (state === "archived") invalidateCommunities();
      else updateGroupSummary(groupId, (g) => ({ ...g, state, frozenReason: state === "frozen" ? reason : null }));
      void queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
      void queryClient.invalidateQueries({ queryKey: ["admin", "paused"] });
      return;
    }
    case "members_changed":
    case "pins_changed":
      void queryClient.invalidateQueries({ queryKey: keys.group(e.payload.groupId) });
      return;
    case "group_updated":
      void queryClient.invalidateQueries({ queryKey: keys.group(e.payload.groupId) });
      invalidateCommunities();
      return;
    case "group_joined":
    case "group_left":
    case "community_left":
      invalidateCommunities();
      return;
    default:
      return;
  }
}

/** Adds or removes my reaction locally, then tells the server (undone if it fails). */
export async function toggleReaction(m: D1Message, emoji: string) {
  const mine = m.reactions.find((r) => r.emoji === emoji)?.mine ?? false;
  const apply = (add: boolean) =>
    updateMessages(m.groupId, (list) =>
      list.map((x) => {
        if (x.id !== m.id) return x;
        const has = x.reactions.find((r) => r.emoji === emoji);
        let reactions = x.reactions;
        if (has) reactions = x.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + (add ? 1 : -1), mine: add } : r));
        else if (add) reactions = [...x.reactions, { emoji, count: 1, mine: true }];
        return { ...x, reactions: reactions.filter((r) => r.count > 0) };
      }),
    );
  apply(!mine);
  try {
    if (mine) await api.unreact(m.id, emoji);
    else await api.react(m.id, emoji);
  } catch (err) {
    apply(mine);
    throw err;
  }
}

/** Casts (or clears, with an empty list) my vote on a poll: updated here at once, undone if the server refuses. */
export async function castVote(m: D1Message, optionIds: string[]) {
  const before = m.content?.kind === "poll" ? m.content.poll : null;
  if (!before) return;
  const apply = (mine: string[]) =>
    updateMessages(m.groupId, (list) =>
      list.map((x) => {
        if (x.id !== m.id || x.content?.kind !== "poll") return x;
        const poll = x.content.poll;
        const votes = poll.options.map((o) => {
          const had = poll.myOptionIds.includes(o.id) ? 1 : 0;
          const has = mine.includes(o.id) ? 1 : 0;
          return { optionId: o.id, count: Math.max(0, (poll.votes.find((v) => v.optionId === o.id)?.count ?? 0) - had + has) };
        });
        const totalVoters = Math.max(0, poll.totalVoters - (poll.myOptionIds.length > 0 ? 1 : 0) + (mine.length > 0 ? 1 : 0));
        return { ...x, content: { ...x.content, poll: { ...poll, votes, totalVoters, myOptionIds: mine } } };
      }),
    );
  apply(optionIds);
  try {
    await api.vote(m.id, optionIds);
  } catch (err) {
    apply(before.myOptionIds);
    throw err;
  }
}
