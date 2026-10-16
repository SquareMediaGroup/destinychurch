// The open chat: header, paused banner, messages, composer.

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { MAX_MESSAGE_LENGTH, type D1Message } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { ContextMenu, type MenuItem } from "@/components/ContextMenu";
import { EmojiPicker } from "@/components/EmojiPicker";
import type { Point } from "@/components/Floating";
import { Avatar, Empty, Loading } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { findGroup, flattenMessages, invalidateCommunities, setOpenGroup, toggleReaction, updateMessages, useCommunities, useGroup, useMessages } from "@/lib/chat";
import { dayLabel, plural, sameDay } from "@/lib/format";
import { nav, useNav } from "@/lib/nav";
import { openExternal } from "@/lib/native";
import { MessageRow } from "@/features/chat/MessageRow";
import { ACCEPT, checkFile, uploadAttachment } from "@/features/chat/upload";

function Composer({ groupId, name, replyTo, onCancelReply, onReplyLast }: { groupId: string; name: string; replyTo: D1Message | null; onCancelReply: () => void; onReplyLast: () => void }) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [emojiAt, setEmojiAt] = useState<Point | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastTyping = useRef(0);

  useEffect(() => {
    setDraft("");
    setFile(null);
    setError(null);
  }, [groupId]);
  useEffect(() => {
    if (replyTo) textRef.current?.focus();
  }, [replyTo]);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    const problem = checkFile(f);
    if (problem) setError(problem);
    else {
      setError(null);
      setFile(f);
    }
  };

  /** Puts an emoji where the cursor is, and leaves the cursor after it. */
  const insertEmoji = (emoji: string) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    if (next.length > MAX_MESSAGE_LENGTH) return;
    setDraft(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const canSend = (draft.trim().length > 0 || !!file) && !busy;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      const attachmentId = file ? await uploadAttachment(groupId, file) : undefined;
      const sent = await api.send(groupId, { body: draft.trim() || undefined, replyTo: replyTo?.id, attachmentId });
      updateMessages(groupId, (list) => (list.some((m) => m.id === sent.id) ? list : [...list, sent]));
      invalidateCommunities();
      setDraft("");
      setFile(null);
      onCancelReply();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      textRef.current?.focus();
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="card" style={{ borderRadius: 14, boxShadow: dragging ? "0 0 0 2px var(--orange)" : "0 1px 2px rgba(14,16,19,0.04)", display: "flex", flexDirection: "column" }}>
        {replyTo && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 0 14px" }}>
            <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: "var(--orange)" }} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tint)" }}>Replying to {replyTo.mine ? "yourself" : replyTo.sender?.displayName ?? "a former member"}</span>
              <span className="muted ellipsis" style={{ fontSize: 12 }}>{replyTo.body ?? "File"}</span>
            </div>
            <button className="ib sm" onClick={onCancelReply} aria-label="Cancel reply" style={{ color: "var(--subtle)" }}><Icon name="x" size={13} stroke={2.4} /></button>
          </div>
        )}
        {file && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 0 12px" }}>
            <span className="av" style={{ width: 32, height: 32, borderRadius: 8 }}><Icon name="file" size={16} /></span>
            <span className="ellipsis" style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{file.name}</span>
            <button className="ib sm" onClick={() => setFile(null)} aria-label="Remove file" style={{ color: "var(--subtle)" }}><Icon name="x" size={13} stroke={2.4} /></button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, padding: 6 }}>
          <button className="ib" style={{ width: 32, height: 32 }} aria-label="Attach a photo or PDF" onClick={() => fileInput.current?.click()}>
            <Icon name="plus" size={18} stroke={2} />
          </button>
          <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <textarea
            ref={textRef}
            aria-label="Message"
            placeholder={`Message ${name}`}
            value={draft}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => {
              setDraft(e.target.value);
              if (Date.now() - lastTyping.current > 4000) {
                lastTyping.current = Date.now();
                void api.typing(groupId).catch(() => undefined);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              } else if (e.key === "Escape" && replyTo) {
                onCancelReply();
              } else if (e.key === "ArrowUp" && draft === "" && !replyTo) {
                // Like most chat apps: Up in an empty box replies to the latest message.
                e.preventDefault();
                onReplyLast();
              }
            }}
            onPaste={(e) => pick(e.clipboardData.files[0])}
            style={{ flex: 1, minWidth: 0, minHeight: 32, maxHeight: 160, border: 0, outline: 0, background: "transparent", fontSize: 14, lineHeight: "20px", padding: "6px 4px", resize: "none", fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            className="ib"
            style={{ width: 32, height: 32 }}
            aria-label="Add an emoji"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setEmojiAt({ x: r.right - 296, y: r.top - 240 });
            }}
          >
            <Icon name="smile" size={18} stroke={2} />
          </button>
          <button
            onClick={() => void send()}
            aria-label="Send"
            disabled={!canSend}
            style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: canSend ? "var(--orange)" : "var(--fill2)", color: canSend ? "var(--on-orange)" : "var(--subtle)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", opacity: 1 }}
          >
            <Icon name="send" size={16} stroke={2.4} />
          </button>
        </div>
      </div>
      {emojiAt && <EmojiPicker at={emojiAt} onPick={insertEmoji} onClose={() => { setEmojiAt(null); textRef.current?.focus(); }} />}
      {error ? (
        <div className="error" role="alert" style={{ padding: "6px 4px 0" }}>{error}</div>
      ) : (
        <div className="subtle" style={{ padding: "6px 4px 0", fontSize: 11 }}>
          {busy ? "Sending…" : "Return to send, Shift-Return for a new line. Drop a photo or PDF to attach it. Chats aren't end-to-end encrypted, so the safeguarding team can review them if a concern is raised."}
        </div>
      )}
    </div>
  );
}

export function Conversation({ groupId }: { groupId: string }) {
  const { infoOpen } = useNav();
  const communities = useCommunities();
  const found = findGroup(communities.data, groupId);
  const group = useGroup(groupId);
  const messages = useMessages(groupId);
  const list = useMemo(() => flattenMessages(messages.data), [messages.data]);
  const [replyTo, setReplyTo] = useState<D1Message | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ m: D1Message; at: Point } | null>(null);
  const [picker, setPicker] = useState<{ m: D1Message; at: Point } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const g = group.data ?? found?.group;
  const detail = group.data;
  const admins = useMemo(() => new Set((detail?.members ?? []).filter((m) => m.role === "admin").map((m) => m.id)), [detail]);

  useEffect(() => {
    setOpenGroup(groupId);
    setReplyTo(null);
    setActionError(null);
    setMenu(null);
    setPicker(null);
    return () => setOpenGroup(null);
  }, [groupId]);

  // Read up to the newest message while it's on screen.
  const newest = list.length ? list[list.length - 1].id : null;
  useEffect(() => {
    if (newest && document.hasFocus()) void api.markRead(groupId, newest).catch(() => undefined);
  }, [groupId, newest]);

  if (!g) return group.isLoading || communities.isLoading ? <Loading /> : <Empty title="Group not found" sub="You may have left it." />;

  const isAnn = g.kind === "announcements";
  const frozen = g.state === "frozen";
  const canManage = !!detail?.canManage;
  const canPost = detail ? detail.canPost : !frozen && !isAnn;
  const sub = [found?.community.name, g.department, detail ? plural(detail.members.length, "member") : null].filter(Boolean).join(" · ");

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(errorText(err));
    }
  };

  const menuItems = (m: D1Message): MenuItem[] => {
    const items: MenuItem[] = [{ label: "Reply", icon: "reply", onSelect: () => setReplyTo(m) }];
    if (m.body) {
      const body = m.body;
      items.push({ label: "Copy text", icon: "copy", onSelect: () => void navigator.clipboard.writeText(window.getSelection()?.toString() || body).catch(() => undefined) });
    }
    if (m.attachment?.url) {
      const url = m.attachment.url;
      items.push({ label: m.attachment.mimeType.startsWith("image/") ? "Open photo" : "Open file", icon: "arrowUpRight", onSelect: () => void openExternal(url) });
    }
    if (!m.mine) {
      items.push({ label: "Report", icon: "flag", onSelect: () => nav.openSheet({ kind: "report", messageId: m.id, sender: m.sender?.displayName ?? "Former member", body: m.body ?? "File" }) });
    }
    if (m.mine || canManage) items.push({ label: "Delete", icon: "trash", danger: true, onSelect: () => nav.openSheet({ kind: "delete", messageId: m.id, groupId }) });
    return items;
  };

  return (
    <>
      <header className="page-header drag" data-tauri-drag-region style={{ gap: 12, padding: "0 12px 0 20px" }}>
        <Avatar name={g.name} size={30} square ann={isAnn} url={g.iconUrl} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <h1 className="ellipsis">{isAnn && found ? `${found.community.name} Announcements` : g.name}</h1>
          <span className="sub ellipsis">{sub}</span>
        </div>
        {g.muted && <span className="subtle" style={{ fontSize: 12, padding: "0 6px" }}>Muted</span>}
        <button className="ib" onClick={nav.toggleInfo} aria-label="Group info" aria-pressed={infoOpen} style={{ background: infoOpen ? "var(--fill2)" : "transparent" }}>
          <Icon name="sidebar" size={18} />
        </button>
      </header>

      {frozen && (
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", background: "var(--accent-soft)", borderBottom: "0.5px solid var(--sep)" }}>
          <Icon name="pause" size={18} stroke={2} color="var(--tint)" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>This group is paused</span>
            <span className="muted" style={{ fontSize: 12 }}>{g.frozenReason ?? "It needs at least 3 people including 2 adults."}</span>
          </div>
          {canManage && <button className="btn dark" onClick={() => nav.openSheet({ kind: "addPeople", groupId })}>Add an adult</button>}
        </div>
      )}

      <div
        ref={scroller}
        className="scroll"
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column-reverse" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          // column-reverse: the top of the history is the most negative scrollTop.
          if (el.scrollHeight + el.scrollTop - el.clientHeight < 200 && messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
        }}
      >
        <div style={{ width: "100%", maxWidth: 820, margin: "0 auto", padding: "16px 24px 20px", display: "flex", flexDirection: "column" }}>
          {messages.isFetchingNextPage && <div className="subtle" style={{ textAlign: "center", fontSize: 12, padding: 8 }}>Loading older messages…</div>}
          {messages.isLoading && <Loading what="Loading messages" />}
          {messages.error && <div className="error" style={{ textAlign: "center" }}>Couldn't load messages. {errorText(messages.error)}</div>}
          {!messages.isLoading && list.length === 0 && !messages.error && <Empty title="No messages yet" sub="Say hello." />}
          {list.map((m, i) => {
            const prev = list[i - 1];
            const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
            const first = newDay || !prev || prev.deleted !== m.deleted || prev.mine !== m.mine || prev.sender?.id !== m.sender?.id;
            return (
              <div key={m.id}>
                {newDay && (
                  <div style={{ padding: "16px 0 6px", textAlign: "center" }}>
                    <span className="subtle" style={{ fontSize: 11, fontWeight: 600, background: "var(--fill)", padding: "3px 10px", borderRadius: 10 }}>{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <MessageRow
                  m={m}
                  first={first}
                  replyTo={m.replyTo ? list.find((x) => x.id === m.replyTo) ?? null : null}
                  senderIsAdmin={!!m.sender && admins.has(m.sender.id)}
                  canDelete={m.mine || canManage}
                  onReact={(e) => void run(() => toggleReaction(m, e))}
                  onReply={() => setReplyTo(m)}
                  onReport={() => nav.openSheet({ kind: "report", messageId: m.id, sender: m.sender?.displayName ?? "Former member", body: m.body ?? "File" })}
                  onDelete={() => nav.openSheet({ kind: "delete", messageId: m.id, groupId })}
                  onContextMenu={(at) => setMenu({ m, at })}
                  onMoreReactions={(at) => setPicker({ m, at })}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: "none", padding: "0 24px 18px" }}>
        <div style={{ maxWidth: 772, margin: "0 auto" }}>
          {actionError && <div className="error" role="alert" style={{ paddingBottom: 6 }}>{actionError}</div>}
          {canPost ? (
            <Composer
              groupId={groupId}
              name={g.name}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onReplyLast={() => {
                const last = [...list].reverse().find((x) => !x.deleted);
                if (last) setReplyTo(last);
              }}
            />
          ) : (
            <div style={{ height: 44, borderRadius: 12, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--subtle)" }}>
              {frozen ? "You can read this group, but no one can post until it reopens" : isAnn ? "Only admins can post here" : "You can't post here"}
            </div>
          )}
        </div>
      </div>

      {menu && (
        <ContextMenu
          at={menu.at}
          items={menuItems(menu.m)}
          onReact={(e) => void run(() => toggleReaction(menu.m, e))}
          onMoreReactions={(at) => {
            setPicker({ m: menu.m, at });
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
      {picker && <EmojiPicker at={picker.at} label="Choose a reaction" onPick={(e) => void run(() => toggleReaction(picker.m, e))} onClose={() => setPicker(null)} />}
    </>
  );
}

export function NoChat() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header className="page-header drag" data-tauri-drag-region />
      <Empty title="Pick a group" sub="Choose a chat or an admin page from the sidebar." />
    </div>
  );
}
