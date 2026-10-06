// Everything B3 Group chat needs: the group, its messages (paged oldest to
// newest), and the write actions. Both live in the app cache (src/lib/queries.ts),
// so a chat you've opened before renders on the first frame, and the app-wide
// Realtime hub keeps it current even while it isn't on screen. Opening a chat
// only asks the server when nothing is cached or the cache was marked stale.
//
// Sends are optimistic: a local message with a negative id shows at once as
// "sending", is swapped for the server's copy on success, and stays as
// "failed" (tap to retry) on error. Realtime echoes of our own writes are
// de-duplicated by id (messages) or ignored (our own reactions, which were
// already applied locally).

import { useCallback, useEffect, useRef, useState } from "react";
import { canSendAs, sendAsCandidates, signedUrlNeedsRefresh, type D1EventRef, type D1EventSummary, type D1Me, type D1MessageContent, type D1PollDraft } from "@destiny/shared";
import * as accounts from "@/lib/accounts";
import { api } from "@/lib/api";
import { keys, PAGE, updateGroupSummary, updateMessages, upsert, useGroup, useMessages, type LocalMessage, type MessagesData } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";

export type { LocalMessage };

let localIds = -1;

type SendInput = { body?: string; replyTo?: number; attachmentId?: string; poll?: D1PollDraft; event?: D1EventRef };
type Pending = { input: SendInput; upload?: () => Promise<string> };
/** Unsent messages, kept outside the screen so "tap to retry" still works after leaving and coming back. */
const pending = new Map<number, Pending>();

/** Attachment ids whose fresh links are already being fetched, so a re-render doesn't ask twice. */
const refreshing = new Set<string>();

/**
 * Attachment links last an hour but cached messages last up to 30 days. Swap
 * in fresh links for any that have expired (or nearly), in one request.
 * Returns the fresh URL for each id it could refresh.
 */
export async function refreshAttachmentUrls(groupId: string, messages: LocalMessage[]): Promise<Map<string, string>> {
  const stale = messages
    .filter((m) => m.attachment && !refreshing.has(m.attachment.id) && (!m.attachment.url || signedUrlNeedsRefresh(m.attachment.url)))
    .map((m) => m.attachment!.id);
  const fresh = new Map<string, string>();
  if (stale.length === 0) return fresh;
  stale.forEach((id) => refreshing.add(id));
  try {
    const { urls } = await api.attachmentUrls(groupId, stale);
    for (const u of urls) if (u.url) fresh.set(u.id, u.url);
    if (fresh.size) {
      const swap = (list: LocalMessage[]) =>
        list.map((m) => (m.attachment && fresh.has(m.attachment.id) ? { ...m, attachment: { ...m.attachment, url: fresh.get(m.attachment.id)! } } : m));
      updateMessages(groupId, swap);
      // The same files may be cached for Group info → Photos and files too.
      queryClient.setQueryData<MessagesData>(keys.media(groupId), (old) => (old ? { ...old, messages: swap(old.messages) } : old));
    }
  } catch {
    // Offline or refused: the old link stays, and the next open tries again.
  } finally {
    stale.forEach((id) => refreshing.delete(id));
  }
  return fresh;
}

export function useConversation(groupId: string, me: D1Me | null, unreadAtOpen: number) {
  const groupQuery = useGroup(groupId);
  const messagesQuery = useMessages(groupId);
  const group = groupQuery.data ?? null;
  const messages = messagesQuery.data?.messages ?? null;
  const nextBefore = messagesQuery.data?.nextBefore ?? null;
  const [loadingOlder, setLoadingOlder] = useState(false);
  const lastRead = useRef(0);

  // Where the "New messages" divider goes: worked out once, from the unread
  // count the chat list had when this chat was opened.
  const [firstUnread, setFirstUnread] = useState<number | null | undefined>(undefined);
  if (firstUnread === undefined && messages) {
    const others = messages.filter((m) => !m.mine && m.id > 0);
    setFirstUnread(unreadAtOpen > 0 && others.length ? others[Math.max(0, others.length - unreadAtOpen)].id : null);
  }

  const setMessages = useCallback((fn: (list: LocalMessage[]) => LocalMessage[]) => {
    queryClient.setQueryData<MessagesData>(keys.messages(groupId), (old) => ({ messages: fn(old?.messages ?? []), nextBefore: old?.nextBefore ?? null }));
  }, [groupId]);

  // Cached chats outlive their attachment links: refresh expired ones whenever the list changes.
  useEffect(() => {
    if (messages?.some((m) => m.attachment)) void refreshAttachmentUrls(groupId, messages);
  }, [groupId, messages]);

  /** A link that works right now for this message's file (fetching a fresh one if it has expired). */
  const attachmentUrl = useCallback(
    async (m: LocalMessage): Promise<string | null> => {
      if (!m.attachment) return null;
      if (m.attachment.url && !signedUrlNeedsRefresh(m.attachment.url, Date.now(), 30_000)) return m.attachment.url;
      const fresh = await refreshAttachmentUrls(groupId, [{ ...m, attachment: { ...m.attachment, url: null } }]);
      return fresh.get(m.attachment.id) ?? m.attachment.url;
    },
    [groupId],
  );

  const reload = useCallback(() => queryClient.refetchQueries({ queryKey: keys.messages(groupId) }), [groupId]);
  const reloadGroup = useCallback(() => queryClient.refetchQueries({ queryKey: keys.group(groupId) }), [groupId]);

  const loadOlder = useCallback(async () => {
    if (!nextBefore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.messages(groupId, { before: nextBefore, limit: PAGE });
      queryClient.setQueryData<MessagesData>(keys.messages(groupId), (old) => ({
        messages: [...page.messages, ...(old?.messages ?? []).filter((m) => !page.messages.some((p) => p.id === m.id))],
        nextBefore: page.nextBefore,
      }));
    } catch {
      // Leave nextBefore as is; scrolling up again retries.
    } finally {
      setLoadingOlder(false);
    }
  }, [groupId, nextBefore, loadingOlder]);

  /** Mark read up to the newest real message. Cheap to call often. */
  const markRead = useCallback(() => {
    const newest = [...(messages ?? [])].reverse().find((m) => m.id > 0);
    if (!newest || newest.id <= lastRead.current) return;
    lastRead.current = newest.id;
    updateGroupSummary(groupId, (g) => (g.unreadCount ? { ...g, unreadCount: 0 } : g));
    void api.markRead(groupId, newest.id).catch(() => {
      lastRead.current = 0;
    });
  }, [groupId, messages]);

  const post = useCallback(
    async (local: LocalMessage, input: Pending["input"]) => {
      try {
        const sent = await api.send(groupId, input);
        setMessages((list) => upsert(list.filter((m) => m.id !== local.id), sent));
        if (sent.attachment) void reload();
      } catch (err) {
        updateMessages(groupId, (list) => list.map((m) => (m.id === local.id ? { ...m, status: "failed" } : m)));
        throw err;
      }
    },
    [groupId, setMessages, reload],
  );

  /** Uploads first (if a file is attached), then posts. The bubble shows straight away. */
  const deliver = useCallback(
    async (local: LocalMessage, p: Pending) => {
      if (p.upload && !p.input.attachmentId) {
        try {
          p.input.attachmentId = await p.upload();
        } catch (err) {
          updateMessages(groupId, (list) => list.map((m) => (m.id === local.id ? { ...m, status: "failed" } : m)));
          throw err;
        }
      }
      await post(local, p.input);
      pending.delete(local.id);
    },
    [groupId, post],
  );

  const send = useCallback(
    async (input: { body?: string; replyTo?: number }, attach?: { file: NonNullable<LocalMessage["localAttachment"]>; upload: () => Promise<string> }) => {
      const local: LocalMessage = {
        id: localIds--,
        groupId,
        sender: me ? { id: me.id, displayName: me.displayName } : null,
        body: input.body ?? null,
        replyTo: input.replyTo ?? null,
        attachment: null,
        content: null,
        reactions: [],
        createdAt: new Date().toISOString(),
        deleted: false,
        mine: true,
        status: "sending",
        localAttachment: attach?.file,
      };
      const p: Pending = { input: { ...input }, upload: attach?.upload };
      pending.set(local.id, p);
      setMessages((list) => [...list, local]);
      await deliver(local, p);
    },
    [groupId, me, deliver, setMessages],
  );

  const retry = useCallback(
    async (localId: number) => {
      const p = pending.get(localId);
      const local = messages?.find((m) => m.id === localId);
      if (!p || !local) return;
      updateMessages(groupId, (list) => list.map((m) => (m.id === localId ? { ...m, status: "sending" } : m)));
      await deliver(local, p).catch(() => undefined);
    },
    [groupId, messages, deliver],
  );

  /** A poll or event: no upload step, and the bubble shows the real content straight away. */
  const sendContent = useCallback(
    async (content: D1MessageContent, input: { poll?: D1PollDraft; event?: D1EventRef }) => {
      const local: LocalMessage = {
        id: localIds--,
        groupId,
        sender: me ? { id: me.id, displayName: me.displayName } : null,
        body: null,
        replyTo: null,
        attachment: null,
        content,
        reactions: [],
        createdAt: new Date().toISOString(),
        deleted: false,
        mine: true,
        status: "sending",
      };
      const p: Pending = { input };
      pending.set(local.id, p);
      setMessages((list) => [...list, local]);
      await deliver(local, p);
    },
    [groupId, me, deliver, setMessages],
  );

  const sendPoll = useCallback(
    (draft: D1PollDraft) =>
      sendContent(
        {
          kind: "poll",
          poll: {
            id: `local-${-localIds}`,
            question: draft.question.trim(),
            options: draft.options.map((label, i) => ({ id: `o${i + 1}`, label: label.trim() })),
            allowMultiple: draft.allowMultiple,
            totalVoters: 0,
            votes: [],
            myOptionIds: [],
          },
        },
        { poll: draft },
      ),
    [sendContent],
  );

  const sendEvent = useCallback(
    (summary: D1EventSummary) =>
      sendContent(
        {
          kind: "event",
          event: {
            seriesKey: summary.seriesKey,
            slug: summary.slug,
            name: summary.name,
            startsAt: summary.startsAt,
            location: summary.location,
            imageUrl: summary.thumbnailUrl,
            webUrl: "",
          },
        },
        { event: { seriesKey: summary.seriesKey, slug: summary.slug } },
      ),
    [sendContent],
  );

  const vote = useCallback(
    async (messageId: number, optionIds: string[]) => {
      const msg = messages?.find((m) => m.id === messageId);
      // A poll still sending (negative id) isn't on the server yet: nothing to vote on.
      if (!msg || messageId < 0 || msg.content?.kind !== "poll") return;
      const previous = msg.content;
      const apply = (poll: typeof previous.poll) =>
        updateMessages(groupId, (list) => list.map((m) => (m.id === messageId ? { ...m, content: { kind: "poll", poll } } : m)));

      const others = previous.poll.votes.map((v) => ({ ...v, count: v.count - (previous.poll.myOptionIds.includes(v.optionId) ? 1 : 0) }));
      const votedBefore = previous.poll.myOptionIds.length > 0;
      const votedAfter = optionIds.length > 0;
      apply({
        ...previous.poll,
        myOptionIds: optionIds,
        totalVoters: previous.poll.totalVoters + (votedAfter ? 1 : 0) - (votedBefore ? 1 : 0),
        votes: previous.poll.options.map((o) => ({
          optionId: o.id,
          count: (others.find((v) => v.optionId === o.id)?.count ?? 0) + (optionIds.includes(o.id) ? 1 : 0),
        })),
      });
      try {
        await api.vote(messageId, optionIds);
      } catch (err) {
        apply(previous.poll);
        throw err;
      }
    },
    [groupId, messages],
  );

  const discard = useCallback(
    (localId: number) => {
      pending.delete(localId);
      updateMessages(groupId, (list) => list.filter((m) => m.id !== localId));
    },
    [groupId],
  );

  const remove = useCallback(
    async (messageId: number) => {
      await api.deleteMessage(messageId);
      updateMessages(groupId, (list) => list.map((m) => (m.id === messageId ? { ...m, deleted: true, body: null, attachment: null, content: null, reactions: [] } : m)));
    },
    [groupId],
  );

  const toggleReaction = useCallback(
    async (messageId: number, emoji: string) => {
      const msg = messages?.find((m) => m.id === messageId);
      if (!msg) return;
      const mine = msg.reactions.some((r) => r.emoji === emoji && r.mine);
      const apply = (on: boolean) =>
        updateMessages(groupId, (list) =>
          list.map((m) => {
            if (m.id !== messageId) return m;
            const r = m.reactions.find((x) => x.emoji === emoji);
            const reactions = r
              ? m.reactions.map((x) => (x.emoji === emoji ? { ...x, count: x.count + (on ? 1 : -1), mine: on } : x))
              : on
                ? [...m.reactions, { emoji, count: 1, mine: true }]
                : m.reactions;
            return { ...m, reactions: reactions.filter((x) => x.count > 0) };
          }),
        );
      apply(!mine);
      try {
        await (mine ? api.unreact(messageId, emoji) : api.react(messageId, emoji));
      } catch (err) {
        apply(mine);
        throw err;
      }
    },
    [groupId, messages],
  );

  /**
   * Other signed-in accounts that could send into this group in place of the
   * active one: never from or as a child account, and only accounts that are
   * in this group. Each account answers as itself; the server has the final say.
   */
  const sendAsOptions = useCallback(async (): Promise<accounts.Account[]> => {
    const all = accounts.accounts();
    const active = all.find((a) => a.slot === accounts.activeSlot());
    if (!canSendAs(active)) return [];
    const others = all.filter((a) => a.slot !== accounts.activeSlot());
    const memberSlots = new Set<string>();
    await Promise.all(
      others.map(async (a) => {
        try {
          const list = await accounts.apiFor(a.slot).communities();
          if (list.some((c) => c.groups.some((g) => g.id === groupId))) memberSlots.add(a.slot);
        } catch {
          // Expired session or offline: that account isn't offered.
        }
      }),
    );
    return sendAsCandidates(others, accounts.activeSlot(), memberSlots);
  }, [groupId]);

  /**
   * Sends as another signed-in account (holding Send). The message is posted
   * with THAT account's own token, so the server sees an ordinary send by that
   * member: membership, freezes and reports all apply to them. The active
   * account isn't switched and shows no optimistic bubble; the message arrives
   * through Realtime, and a reload makes sure it's there.
   */
  const sendAs = useCallback(
    async (slot: string, input: { body: string; replyTo?: number }) => {
      await accounts.apiFor(slot).send(groupId, input);
      void reload();
    },
    [groupId, reload],
  );

  const failed = messagesQuery.error ?? groupQuery.error;
  return {
    group,
    reloadGroup,
    messages,
    // Only worth showing when there's nothing cached to fall back on.
    error: failed && !messages ? errorMessage(failed) : null,
    reload,
    loadOlder,
    hasOlder: !!nextBefore,
    loadingOlder,
    firstUnreadId: firstUnread ?? null,
    markRead,
    send,
    sendAs,
    sendAsOptions,
    sendPoll,
    sendEvent,
    vote,
    retry,
    discard,
    remove,
    toggleReaction,
    attachmentUrl,
  };
}
