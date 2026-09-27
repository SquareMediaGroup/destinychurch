// Everything B3 Group chat needs: the group, its messages (paged oldest to
// newest), live updates on d1-group:<id>, and the write actions.
//
// Sends are optimistic: a local message with a negative id shows at once as
// "sending", is swapped for the server's copy on success, and stays as
// "failed" (tap to retry) on error. Realtime echoes of our own writes are
// de-duplicated by id (messages) or ignored (our own reactions, which were
// already applied locally).

import { useCallback, useEffect, useRef, useState } from "react";
import type { D1GroupDetail, D1Me, D1Message } from "@destiny/shared";
import { api } from "@/lib/api";
import { readCachedConversation, writeCachedConversation } from "@/lib/messageCache";
import { subscribeToGroup } from "@/lib/realtime";
import { errorMessage } from "@/state/session";

export type LocalMessage = D1Message & { status?: "sending" | "failed"; localAttachment?: { name: string; mimeType: string; sizeBytes: number | null } };

const PAGE = 40;
let localIds = -1;

function upsert(list: LocalMessage[], msg: LocalMessage): LocalMessage[] {
  const i = list.findIndex((m) => m.id === msg.id);
  if (i >= 0) {
    const next = list.slice();
    next[i] = { ...list[i], ...msg };
    return next;
  }
  // Server messages stay in id order; unsent local ones (negative ids) stay last.
  const server = list.filter((m) => m.id > 0);
  const local = list.filter((m) => m.id < 0);
  if (msg.id < 0) return [...list, msg];
  const at = server.findIndex((m) => m.id > msg.id);
  if (at >= 0) server.splice(at, 0, msg);
  else server.push(msg);
  return [...server, ...local];
}

export function useConversation(groupId: string, me: D1Me | null) {
  const [group, setGroup] = useState<D1GroupDetail | null>(null);
  const [messages, setMessages] = useState<LocalMessage[] | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstUnreadId, setFirstUnreadId] = useState<number | null>(null);
  const lastRead = useRef(0);
  const meId = me?.id;

  // Keep the on-device cache fresh so the next open of this chat is instant.
  useEffect(() => {
    if (!group || !messages) return;
    writeCachedConversation(groupId, { group, messages: messages.filter((m) => m.id > 0), nextBefore });
  }, [groupId, group, messages, nextBefore]);

  const loadGroup = useCallback(async () => {
    try {
      setGroup(await api.group(groupId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [groupId]);

  const loadLatest = useCallback(async () => {
    try {
      const page = await api.messages(groupId, { limit: PAGE });
      setMessages((prev) => {
        let next = prev ?? [];
        for (const m of page.messages) next = upsert(next, m);
        return next;
      });
      setNextBefore((prev) => prev ?? page.nextBefore);
      setError(null);
      return page;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    }
  }, [groupId]);

  // Initial load: show the cached copy at once (no spinner on a re-open),
  // then fetch group + latest page and work out where "New messages" goes.
  useEffect(() => {
    let cancelled = false;
    setGroup(null);
    setMessages(null);
    readCachedConversation(groupId).then((cached) => {
      if (cancelled || !cached) return;
      setGroup(cached.group);
      setMessages(cached.messages);
      setNextBefore(cached.nextBefore);
    });
    Promise.all([api.group(groupId), api.messages(groupId, { limit: PAGE })])
      .then(([g, page]) => {
        if (cancelled) return;
        setGroup(g);
        setMessages(page.messages);
        setNextBefore(page.nextBefore);
        const others = page.messages.filter((m) => !m.mine);
        if (g.unreadCount > 0 && others.length) setFirstUnreadId(others[Math.max(0, others.length - g.unreadCount)].id);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Live updates.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let stopped = false;
    subscribeToGroup(groupId, (e) => {
      switch (e.event) {
        case "message": {
          const p = e.payload;
          if (p.attachmentId) {
            // The event has no signed URL; fetch the page to get one.
            void loadLatest();
            return;
          }
          setMessages((prev) =>
            upsert(prev ?? [], {
              id: p.id,
              groupId: p.groupId,
              sender: p.sender,
              body: p.body,
              replyTo: p.replyTo,
              attachment: null,
              reactions: [],
              createdAt: p.createdAt,
              deleted: false,
              mine: p.sender.id === meId,
            }),
          );
          return;
        }
        case "message_deleted":
          setMessages((prev) => (prev ?? []).map((m) => (m.id === e.payload.id ? { ...m, deleted: true, body: null, attachment: null, reactions: [] } : m)));
          return;
        case "reaction": {
          const { messageId, memberId, emoji, added } = e.payload;
          if (memberId === meId) return;
          setMessages((prev) =>
            (prev ?? []).map((m) => {
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
        case "members_changed":
        case "group_state":
          void loadGroup();
          return;
      }
    }).then((fn) => {
      if (stopped) fn();
      else unsubscribe = fn;
    });
    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, [groupId, meId, loadGroup, loadLatest]);

  const loadOlder = useCallback(async () => {
    if (!nextBefore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.messages(groupId, { before: nextBefore, limit: PAGE });
      setMessages((prev) => [...page.messages, ...(prev ?? []).filter((m) => !page.messages.some((p) => p.id === m.id))]);
      setNextBefore(page.nextBefore);
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
    void api.markRead(groupId, newest.id).catch(() => {
      lastRead.current = 0;
    });
  }, [groupId, messages]);

  const post = useCallback(
    async (local: LocalMessage, input: { body?: string; replyTo?: number; attachmentId?: string }) => {
      try {
        const sent = await api.send(groupId, input);
        setMessages((prev) => upsert((prev ?? []).filter((m) => m.id !== local.id), sent));
        if (sent.attachment) void loadLatest();
      } catch (err) {
        setMessages((prev) => (prev ?? []).map((m) => (m.id === local.id ? { ...m, status: "failed" } : m)));
        throw err;
      }
    },
    [groupId, loadLatest],
  );

  type Pending = { input: { body?: string; replyTo?: number; attachmentId?: string }; upload?: () => Promise<string> };
  const pending = useRef(new Map<number, Pending>());

  /** Uploads first (if a file is attached), then posts. The bubble shows straight away. */
  const deliver = useCallback(
    async (local: LocalMessage, p: Pending) => {
      if (p.upload && !p.input.attachmentId) {
        try {
          p.input.attachmentId = await p.upload();
        } catch (err) {
          setMessages((prev) => (prev ?? []).map((m) => (m.id === local.id ? { ...m, status: "failed" } : m)));
          throw err;
        }
      }
      await post(local, p.input);
      pending.current.delete(local.id);
    },
    [post],
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
      pending.current.set(local.id, p);
      setMessages((prev) => [...(prev ?? []), local]);
      await deliver(local, p);
    },
    [groupId, me, deliver],
  );

  const retry = useCallback(
    async (localId: number) => {
      const p = pending.current.get(localId);
      const local = messages?.find((m) => m.id === localId);
      if (!p || !local) return;
      setMessages((prev) => (prev ?? []).map((m) => (m.id === localId ? { ...m, status: "sending" } : m)));
      await deliver(local, p).catch(() => undefined);
    },
    [messages, deliver],
  );

  const discard = useCallback((localId: number) => {
    pending.current.delete(localId);
    setMessages((prev) => (prev ?? []).filter((m) => m.id !== localId));
  }, []);

  const remove = useCallback(async (messageId: number) => {
    await api.deleteMessage(messageId);
    setMessages((prev) => (prev ?? []).map((m) => (m.id === messageId ? { ...m, deleted: true, body: null, attachment: null, reactions: [] } : m)));
  }, []);

  const toggleReaction = useCallback(
    async (messageId: number, emoji: string) => {
      const msg = messages?.find((m) => m.id === messageId);
      if (!msg) return;
      const mine = msg.reactions.some((r) => r.emoji === emoji && r.mine);
      const apply = (on: boolean) =>
        setMessages((prev) =>
          (prev ?? []).map((m) => {
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
    [messages],
  );

  return { group, reloadGroup: loadGroup, messages, error, reload: loadLatest, loadOlder, hasOlder: !!nextBefore, loadingOlder, firstUnreadId, markRead, send, retry, discard, remove, toggleReaction };
}
