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

import { useCallback, useRef, useState } from "react";
import type { D1Me } from "@destiny/shared";
import { api } from "@/lib/api";
import { keys, PAGE, updateGroupSummary, updateMessages, upsert, useGroup, useMessages, type LocalMessage, type MessagesData } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";

export type { LocalMessage };

let localIds = -1;

type Pending = { input: { body?: string; replyTo?: number; attachmentId?: string }; upload?: () => Promise<string> };
/** Unsent messages, kept outside the screen so "tap to retry" still works after leaving and coming back. */
const pending = new Map<number, Pending>();

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
  const firstUnread = useRef<number | null | undefined>(undefined);
  if (firstUnread.current === undefined && messages) {
    const others = messages.filter((m) => !m.mine && m.id > 0);
    firstUnread.current = unreadAtOpen > 0 && others.length ? others[Math.max(0, others.length - unreadAtOpen)].id : null;
  }

  const setMessages = useCallback((fn: (list: LocalMessage[]) => LocalMessage[]) => {
    queryClient.setQueryData<MessagesData>(keys.messages(groupId), (old) => ({ messages: fn(old?.messages ?? []), nextBefore: old?.nextBefore ?? null }));
  }, [groupId]);

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
      updateMessages(groupId, (list) => list.map((m) => (m.id === messageId ? { ...m, deleted: true, body: null, attachment: null, reactions: [] } : m)));
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
    firstUnreadId: firstUnread.current ?? null,
    markRead,
    send,
    retry,
    discard,
    remove,
    toggleReaction,
  };
}
