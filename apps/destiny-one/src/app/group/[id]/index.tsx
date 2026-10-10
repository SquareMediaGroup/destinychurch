// B3 Group chat — variant 1F "Avatars". Inverted list (newest at the bottom),
// floating glass header, and one of three footers: the composer, "Only admins
// can post here" (announcements), or the paused card (frozen group).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useIsPreview, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AssistantStreaming } from "@/components/AssistantStreaming";
import { Composer } from "@/components/Composer";
import { Backdrop } from "@/components/Wallpaper";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { Appear, PressableScale } from "@/components/Motion";
import type { MessageMenuActions } from "@/components/MessageMenu";
import { Divider, MessageBubble, buildRows, type Row } from "@/components/MessageBubble";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { Avatar, BackButton, ConfirmDialog, EmptyState, ErrorState, GlassIconButton, PrimaryButton, withAlpha } from "@/components/ui";
import { DESTINY_AI, canEditMessage, canSendAs, findMentions } from "@destiny/shared";
import type { Account } from "@/lib/accounts";
import { messageSummary, plural } from "@/lib/format";
import { api } from "@/lib/api";
import { downloadAttachment, isPhoto, shareFile } from "@/lib/media";
import { haptic } from "@/lib/haptics";
import { hideSender, setOpenGroup } from "@/lib/queries";
import { uploadAttachment } from "@/lib/upload";
import { useConversation, type LocalMessage } from "@/lib/useConversation";
import { chatDrafts } from "@/state/drafts";
import { useAssistantStream } from "@/state/assistantStream";
import { eventPick, useEventPick } from "@/state/eventPick";
import { jumpTo, useJumpTarget } from "@/state/jump";
import { typingLabel, typingPing, useTyping } from "@/state/typing";
import { pollDraft, usePollDraft } from "@/state/pollDraft";
import { errorMessage, useGroupSummary, useSession } from "@/state/session";
import { PHOTO_CHIP_ALPHA } from "@/theme/appearance";
import { ORANGE, useTheme } from "@/theme/tokens";

/** How far back (pages of 40) a search result will go to find its message. */
const MAX_JUMP_PAGES = 10;

export default function GroupChat() {
  const t = useTheme();
  // Pressing and holding a chat in the list peeks at it here: read-only, and
  // it doesn't count as reading it (no receipts, the badge stays).
  const preview = useIsPreview();
  const safe = useSafeAreaInsets();
  const insets = preview ? { top: 8, bottom: 0, left: 0, right: 0 } : safe;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, setMe, accounts, activeSlot } = useSession();
  // Only when there's another account on this phone, and never from a child account (then a slow tap must still just send).
  const sendAsEnabled = accounts.length > 1 && canSendAs(accounts.find((a) => a.slot === activeSlot));
  const summary = useGroupSummary(id);
  // Read before the chat marks itself read, for the "New messages" divider.
  const [unreadAtOpen] = useState(() => summary?.group.unreadCount ?? 0);
  const convo = useConversation(id, me, unreadAtOpen);
  const { group, messages, firstUnreadId, markRead } = convo;

  const list = useRef<FlatList<Row>>(null);
  const input = useRef<TextInput>(null);
  const [deleting, setDeleting] = useState<LocalMessage | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [blocking, setBlocking] = useState<{ id: string; name: string } | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<LocalMessage | null>(null);
  const [editing, setEditing] = useState<LocalMessage | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(() => (messages ? buildRows(messages, firstUnreadId).reverse() : []), [messages, firstUnreadId]);
  // DestinyAI's answer while it's being written sits at the bottom (index 0 of the inverted list).
  const liveAnswer = useAssistantStream(id);
  const shownRows = useMemo<Row[]>(
    () => (liveAnswer && (liveAnswer.label || liveAnswer.text) ? [{ kind: "stream", key: "stream", label: liveAnswer.label, text: liveAnswer.text }, ...rows] : rows),
    [liveAnswer, rows],
  );

  // Messages that turn up while the chat is open (sent here, or arriving live)
  // spring in; everything already there, or loaded from further back, doesn't.
  const [openedAt] = useState(() => Date.now());
  const arriving = (m: LocalMessage) => m.id < 0 || (!m.mine && Date.parse(m.createdAt) > openedAt);

  // A light tap when someone else's message lands while you're reading.
  const newestSeen = useRef(0);
  useEffect(() => {
    const newest = messages?.[messages.length - 1];
    if (!newest || newest.id <= newestSeen.current) return;
    const fresh = newestSeen.current > 0 && !newest.mine && Date.parse(newest.createdAt) > openedAt;
    newestSeen.current = newest.id;
    if (fresh && !preview) haptic.tick();
  }, [messages, openedAt, preview]);
  const byId = useMemo(() => new Map((messages ?? []).map((m) => [m.id, m])), [messages]);
  const admins = useMemo(() => new Set((group?.members ?? []).filter((m) => m.role === "admin").map((m) => m.id)), [group]);
  const tags = useMemo(() => new Map((group?.members ?? []).map((m) => [m.id, m.tag])), [group]);
  // Everyone in the group, for drawing "@Name"; everyone but me, for the composer's suggestions.
  // DestinyAI is always among them: in a group, "@DestinyAI" asks it something.
  const isAssistant = (group?.kind ?? summary?.group.kind) === "assistant";
  const people = useMemo(
    () => [DESTINY_AI, ...(group?.members ?? []).filter((m) => m.id !== DESTINY_AI.id).map((m) => ({ id: m.id, displayName: m.displayName }))],
    [group],
  );
  const mentionables = useMemo(() => (isAssistant ? [] : people.filter((p) => p.id !== me?.id)), [people, me?.id, isAssistant]);

  // While on screen, new messages here aren't unread.
  useFocusEffect(
    useCallback(() => {
      if (preview) return;
      setOpenGroup(id);
      return () => setOpenGroup(null);
    }, [id, preview]),
  );
  // Read receipts while the chat is on screen.
  useFocusEffect(
    useCallback(() => {
      if (!preview) markRead();
    }, [markRead, preview]),
  );

  // Leaving the chat: the chat list picks up its draft (or that it's gone).
  useEffect(() => () => chatDrafts.flush(), []);

  useEffect(() => {
    if (!toast) return;
    haptic.error();
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // A search result asked to see one message: load back to it if need be,
  // scroll it into view and highlight it for a moment.
  const jumpTarget = useJumpTarget(id);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const jumpPages = useRef(0);
  const jumpReloaded = useRef(false);
  const { hasOlder, loadingOlder, loadOlder, reload } = convo;
  useEffect(() => {
    if (!jumpTarget || !messages || preview) return;
    const index = rows.findIndex((r) => r.key === `m${jumpTarget}`);
    if (index >= 0) {
      jumpTo.clear();
      jumpPages.current = 0;
      jumpReloaded.current = false;
      requestAnimationFrame(() => {
        setHighlightId(jumpTarget);
        list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      });
      return;
    }
    // Newer than anything cached: it's in the latest page, not further back.
    const newest = messages.reduce((n, m) => Math.max(n, m.id), 0);
    if (jumpTarget > newest) {
      if (!jumpReloaded.current) {
        jumpReloaded.current = true;
        void reload();
      }
      return;
    }
    if (hasOlder && jumpPages.current < MAX_JUMP_PAGES) {
      if (!loadingOlder) {
        jumpPages.current += 1;
        void loadOlder();
      }
      return;
    }
    jumpTo.clear();
    jumpPages.current = 0;
    jumpReloaded.current = false;
    requestAnimationFrame(() => setToast("Couldn't find that message. It may be too far back."));
  }, [jumpTarget, messages, rows, preview, hasOlder, loadingOlder, loadOlder, reload]);
  useEffect(() => {
    if (highlightId === null) return;
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // A poll composed, or an event chosen, on the modal screens that opened
  // from this one's attach sheet — sent as soon as it comes back.
  const { sendPoll, sendEvent } = convo;
  const draft = usePollDraft(id);
  useEffect(() => {
    if (!draft) return;
    pollDraft.clear();
    void sendPoll(draft).catch((err) => setToast(errorMessage(err, "Couldn't send the poll. Try again.")));
  }, [draft, sendPoll]);

  const chosenEvent = useEventPick(id);
  useEffect(() => {
    if (!chosenEvent) return;
    eventPick.clear();
    void sendEvent(chosenEvent).catch((err) => setToast(errorMessage(err, "Couldn't share the event. Try again.")));
  }, [chosenEvent, sendEvent]);

  const name = group?.name ?? summary?.group.name ?? "";
  const isAnnouncements = (group?.kind ?? summary?.group.kind) === "announcements";
  const frozen = group?.state === "frozen";
  const archived = group?.state === "archived";
  const department = group?.department ?? summary?.group.department;
  // "Leah is typing…" takes the place of the member count while it's true.
  const typingNow = typingLabel(useTyping(id));
  const sub = typingNow ?? (isAssistant ? "Smart Search for Destiny" : group ? [department, plural(group.members.length, "member")].filter(Boolean).join(" · ") : department ?? "");
  const canDelete = (m: LocalMessage) => m.mine || group?.myRole === "admin" || !!group?.canManage;
  // Pinned messages (newest pin first). Older cached copies of the group may not have the field yet.
  const pinned = group?.pinned ?? [];
  const [pinIndex, setPinIndex] = useState(0);
  const shownPin = pinned.length ? pinned[pinIndex % pinned.length] : null;

  async function togglePin(m: LocalMessage, on: boolean) {
    try {
      await (on ? api.pin(m.id) : api.unpin(m.id));
      haptic.success();
      void convo.reloadGroup();
    } catch (err) {
      setToast(errorMessage(err));
    }
  }

  // What the system press-and-hold menu does for one message.
  const menuFor = (m: LocalMessage): MessageMenuActions => ({
    canDelete: canDelete(m),
    onReact: (emoji) => void convo.toggleReaction(m.id, emoji).catch((err) => setToast(errorMessage(err))),
    onReply: group?.canPost && !frozen && !archived ? () => startReply(m) : null,
    onCopy: () => {
      if (m.body) void Clipboard.setStringAsync(m.body);
    },
    onEdit: group?.canPost && !frozen && !archived && canEditMessage(m) ? () => startEdit(m) : null,
    onShare: m.attachment ? () => void shareAttachment(m) : null,
    onForward: m.content?.kind === "poll" ? null : () => router.push({ pathname: "/forward", params: { groupId: id, messageId: String(m.id) } }),
    onInfo: m.mine || group?.canManage ? () => router.push({ pathname: "/message-info", params: { groupId: id, messageId: String(m.id) } }) : null,
    pin: group?.canManage && !frozen && !archived ? { pinned: pinned.some((p) => p.id === m.id), run: () => void togglePin(m, !pinned.some((p) => p.id === m.id)) } : null,
    onReport: () => router.push({ pathname: "/report", params: { messageId: String(m.id), name: m.sender?.displayName ?? "Former member", at: m.createdAt, body: messageSummary(m) } }),
    onBlock: () => {
      if (m.sender) setBlocking({ id: m.sender.id, name: m.sender.displayName });
    },
    onDelete: () => setDeleting(m),
  });

  /** Downloads the file (links are private and short-lived) and opens the share sheet on it. */
  async function shareAttachment(m: LocalMessage) {
    const url = await convo.attachmentUrl(m);
    if (!url || !m.attachment) {
      setToast("Couldn't get that file. Try again.");
      return;
    }
    try {
      await shareFile(await downloadAttachment(url, m.attachment.id, m.attachment.mimeType), m.attachment.mimeType);
    } catch (err) {
      setToast(errorMessage(err, "Couldn't share that file. Try again."));
    }
  }

  function startEdit(m: LocalMessage) {
    setReplyTo(null);
    setEditing(m);
    // The composer remounts holding the message's text; focus it once it has.
    requestAnimationFrame(() => input.current?.focus());
  }

  async function sendText(text: string) {
    if (editing) {
      const target = editing;
      setEditing(null);
      await convo.edit(target.id, text, findMentions(text, mentionables)).catch((err) => setToast(errorMessage(err, "Couldn't save the edit. Try again.")));
      return;
    }
    const reply = replyTo;
    setReplyTo(null);
    list.current?.scrollToOffset({ offset: 0, animated: true });
    await convo.send({ body: text, replyTo: reply?.id, mentions: findMentions(text, mentionables) }).catch((err) => setToast(errorMessage(err)));
  }

  /** Holding Send: the other signed-in account sends this text (replies included). */
  async function sendTextAs(account: Account, text: string) {
    const reply = replyTo;
    // The other account can mention anyone but itself; the server drops anyone else not in the group.
    await convo.sendAs(account.slot, { body: text, replyTo: reply?.id, mentions: findMentions(text, people) });
    setReplyTo(null);
    list.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function startReply(m: LocalMessage) {
    setReplyTo(m);
    input.current?.focus();
  }

  async function sendFile(file: Parameters<typeof uploadAttachment>[1]) {
    const reply = replyTo;
    setReplyTo(null);
    list.current?.scrollToOffset({ offset: 0, animated: true });
    try {
      await convo.send({ replyTo: reply?.id }, { file: { name: file.name, mimeType: file.mimeType, sizeBytes: file.size, durationMs: file.durationMs }, upload: () => uploadAttachment(id, file) });
    } catch (err) {
      setToast(errorMessage(err, "Couldn't send the file. Try again."));
    }
  }

  const footer = !group || preview ? null : frozen || archived ? (
    <View style={[{ borderRadius: 28, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.glassLine, padding: 18, paddingBottom: 16, gap: 12 }, t.shadow]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
          <Icon name="pause" size={15} color={t.text} strokeWidth={3.2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{archived ? "This group is archived" : "This group is paused"}</Text>
          <Text style={{ fontSize: 15, lineHeight: 20, color: t.muted }}>{archived ? "You can still read it, but no one can post." : group.frozenReason ?? "No one can post until the group meets the rules again."}</Text>
        </View>
      </View>
      {frozen && group.canManage ? <PrimaryButton label="Add an adult" onPress={() => router.push({ pathname: "/add-people", params: { groupId: id } })} /> : null}
    </View>
  ) : !group.canPost ? (
    <View style={{ alignItems: "center", paddingBottom: 6 }}>
      <GlassSurface style={{ height: 40, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 }}>
        <Icon name="megaphone" size={15} color={t.muted} />
        <Text style={{ fontSize: 14, color: t.muted }}>Only admins can post here</Text>
      </GlassSurface>
    </View>
  ) : (
    <Composer
      // Editing swaps the box's text for the message's; leaving it brings the draft back.
      key={editing ? `edit-${editing.id}` : "compose"}
      ref={input}
      editing={editing?.body ? { text: editing.body } : null}
      onCancelEdit={() => setEditing(null)}
      replying={replyTo ? { name: replyTo.mine ? "yourself" : replyTo.sender?.displayName ?? "Former member", text: messageSummary(replyTo) } : null}
      onCancelReply={() => setReplyTo(null)}
      onSend={sendText}
      loadSendAsOptions={sendAsEnabled ? convo.sendAsOptions : undefined}
      onSendAs={sendAsEnabled ? sendTextAs : undefined}
      onAttach={sendFile}
      onAttachPoll={() => router.push(`/group/${id}/poll`)}
      onAttachEvent={() => router.push(`/group/${id}/event-picker`)}
      onError={setToast}
      initialText={editing?.body ?? chatDrafts.get(id)}
      onTextChange={
        editing
          ? undefined
          : (text) => {
              chatDrafts.set(id, text);
              if (text.trim()) typingPing(id);
            }
      }
      mentionables={mentionables}
      textOnly={isAssistant}
      placeholder={isAssistant ? "Ask DestinyAI" : undefined}
    />
  );

  return (
    // "padding" on Android too: apps are edge-to-edge there now, so the window
    // no longer shrinks for the keyboard and the message box would be covered.
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <Backdrop />
      {!messages ? (
        convo.error ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ErrorState message={convo.error} onRetry={() => {
                void convo.reload();
                void convo.reloadGroup();
              }} />
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={ORANGE} />
          </View>
        )
      ) : (
        <FlatList
          ref={list}
          inverted
          data={shownRows}
          extraData={highlightId}
          keyExtractor={(r) => r.key}
          onScrollToIndexFailed={(info) => {
            // Rows aren't measured yet: get close, then try again once they are.
            list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => list.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 }), 120);
          }}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.top + 70 + (shownPin ? 58 : 0) }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onEndReached={() => void convo.loadOlder()}
          onEndReachedThreshold={0.4}
          onScroll={(e) => setShowJump(e.nativeEvent.contentOffset.y > 400)}
          scrollEventThrottle={100}
          ListFooterComponent={convo.loadingOlder ? <ActivityIndicator color={ORANGE} style={{ paddingVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={[{ transform: [{ scaleY: -1 }] }, t.photo ? { alignSelf: "center", marginHorizontal: 24, borderRadius: 24, backgroundColor: withAlpha(t.bg, PHOTO_CHIP_ALPHA) } : null]}>
              {isAssistant ? (
                <EmptyState
                  title="Ask DestinyAI"
                  body={"Ask about events, services, groups, sermons or giving. It knows the church calendar and everything on Smart Search.\n\nIn a group, type @DestinyAI to ask it there. It only sees the message you tag it in, and the message you're replying to."}
                />
              ) : (
                <EmptyState title="No messages yet" body={group?.canPost ? "Say hello." : undefined} />
              )}
            </View>
          }
          renderItem={({ item }) =>
            item.kind === "stream" ? (
              <AssistantStreaming label={item.label} text={item.text} />
            ) : item.kind === "msg" ? (
              <View style={item.m.id === highlightId ? { backgroundColor: withAlpha(ORANGE, 0.16) } : undefined}>
              <MessageBubble
                row={item}
                replyTo={item.m.replyTo ? byId.get(item.m.replyTo) ?? null : null}
                senderTag={(item.m.sender && tags.get(item.m.sender.id)) || null}
                senderIsGroupAdmin={!!item.m.sender && admins.has(item.m.sender.id)}
                canReply={!!group?.canPost && !frozen && !archived}
                arriving={arriving(item.m)}
                onReply={() => startReply(item.m)}
                menu={menuFor(item.m)}
                onOpenAttachment={(url) => {
                  // An event card carries its own web address; only files need a signed link.
                  if (!item.m.attachment) {
                    if (url) void WebBrowser.openBrowserAsync(url);
                    return;
                  }
                  // Photos open in the viewer, which pages through every photo in this chat.
                  if (isPhoto(item.m)) {
                    router.push({ pathname: "/viewer", params: { groupId: id, messageId: String(item.m.id) } });
                    return;
                  }
                  // Files (PDFs): the cached link may have expired; attachmentUrl fetches a fresh one if so.
                  void convo.attachmentUrl(item.m).then((fresh) => {
                    if (fresh) void WebBrowser.openBrowserAsync(fresh);
                    else setToast("Couldn't open that file. Try again.");
                  });
                }}
                people={people}
                meId={me?.id}
                onToggleReaction={(emoji) => void convo.toggleReaction(item.m.id, emoji).catch((err) => setToast(errorMessage(err)))}
                onVotePoll={(optionIds) => void convo.vote(item.m.id, optionIds).catch((err) => setToast(errorMessage(err)))}
                onRetry={() =>
                  Alert.alert("Message not sent", undefined, [
                    { text: "Try again", onPress: () => void convo.retry(item.m.id) },
                    { text: "Delete", style: "destructive", onPress: () => convo.discard(item.m.id) },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              />
              </View>
            ) : (
              <Divider row={item} />
            )
          }
        />
      )}

      {/* Header: back · group pill (opens info) · search */}
      {t.wall || t.photo ? null : <LinearGradient pointerEvents="none" colors={[t.bg, withAlpha(t.bg, 0)]} locations={[0.45, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 76 }} />}
      <View style={{ position: "absolute", top: insets.top, left: 0, right: 0, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
        {preview ? <View style={{ width: 44 }} /> : <BackButton />}
        <Pressable accessibilityRole={isAssistant ? "header" : "button"} accessibilityLabel={isAssistant ? name : `${name}, group info`} disabled={isAssistant} onPress={() => router.push(`/group/${id}/info`)} style={{ flexShrink: 1, marginHorizontal: 8 }}>
          {({ pressed }) => (
            <GlassSurface interactive style={[{ height: 48, maxWidth: 240, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 6, paddingRight: 16, opacity: pressed ? 0.8 : 1 }, t.shadow]}>
              <Avatar name={name} size={36} announcements={isAnnouncements} assistant={isAssistant} uri={group?.iconUrl ?? summary?.group.iconUrl} />
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: t.text }}>
                  {name}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: typingNow ? t.tint : t.subtle }} accessibilityLiveRegion="polite">
                  {sub}
                </Text>
              </View>
            </GlassSurface>
          )}
        </Pressable>
        {preview || isAssistant ? <View style={{ width: 44 }} /> : <GlassIconButton icon="search" label={name ? `Search in ${name}` : "Search in this chat"} onPress={() => router.push({ pathname: "/search", params: { groupId: id } })} />}
      </View>

      {/* Pinned: the newest pin; tapping shows it in the chat and moves on to the next. */}
      {shownPin && !preview ? (
        <View style={{ position: "absolute", top: insets.top + 62, left: 16, right: 16 }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Pinned message${pinned.length > 1 ? ` ${(pinIndex % pinned.length) + 1} of ${pinned.length}` : ""}: ${messageSummary(shownPin)}. Shows it in the chat.`}
            scaleTo={0.98}
            onPress={() => {
              haptic.selection();
              jumpTo.set(id, shownPin.id);
              setPinIndex((i) => i + 1);
            }}
          >
            <GlassSurface interactive style={[{ minHeight: 48, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, paddingHorizontal: 14 }, t.shadow]}>
              {pinned.length > 1 ? (
                <View style={{ gap: 2 }}>
                  {pinned.map((p, i) => (
                    <View key={p.id} style={{ width: 3, height: Math.max(6, 30 / pinned.length - 2), borderRadius: 1.5, backgroundColor: i === pinIndex % pinned.length ? t.tint : t.sep }} />
                  ))}
                </View>
              ) : null}
              <Icon name="pin" size={16} color={t.tint} strokeWidth={2.2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: t.tint }}>Pinned</Text>
                <Text numberOfLines={1} style={{ fontSize: 14, color: t.text }}>
                  {messageSummary(shownPin)}
                </Text>
              </View>
            </GlassSurface>
          </PressableScale>
        </View>
      ) : null}

      {/* Footer */}
      <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 12) }}>
        {toast ? (
          <Appear key={toast} from={{ y: 14, scale: 0.9 }} style={{ alignItems: "center", marginBottom: 8 }}>
            <GlassSurface style={{ borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 14, color: t.text }}>{toast}</Text>
            </GlassSurface>
          </Appear>
        ) : null}
        {showJump ? (
          <Appear from={{ y: 10, scale: 0.5 }} style={{ position: "absolute", right: 16, top: -52 }}>
            <PressableScale
              accessibilityLabel="Jump to latest"
              scaleTo={0.88}
              onPress={() => {
                haptic.tick();
                list.current?.scrollToOffset({ offset: 0, animated: true });
              }}
            >
              <GlassSurface interactive style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, t.shadow]}>
                <Icon name="chevronDown" size={20} color={t.text} strokeWidth={2.4} />
              </GlassSurface>
            </PressableScale>
          </Appear>
        ) : null}
        {footer}
      </View>

      <ConfirmDialog
        visible={!!blocking}
        title={`Block ${blocking?.name ?? ""}?`}
        body={`You won't see their messages or get notifications from them, and they won't be told. You both stay in your groups. Leaders can still see the chats, including that you blocked ${blocking?.name.split(" ")[0] ?? "them"}. If they've made you feel unsafe, report the message too.`}
        confirmLabel="Block"
        busy={blockBusy}
        onCancel={() => setBlocking(null)}
        onConfirm={async () => {
          if (!blocking) return;
          setBlockBusy(true);
          try {
            setMe(await api.block(blocking.id));
            hideSender(blocking.id);
            setToast(`${blocking.name} is blocked. You can unblock them in Settings.`);
          } catch (err) {
            setToast(errorMessage(err));
          }
          setBlockBusy(false);
          setBlocking(null);
        }}
      />

      <ConfirmDialog
        visible={!!deleting}
        title="Delete for everyone?"
        body="It will be removed for everyone. We keep a copy for a while in case we need to look into something."
        confirmLabel="Delete"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setDeleteBusy(true);
          try {
            await convo.remove(deleting.id);
          } catch (err) {
            setToast(errorMessage(err));
          }
          setDeleteBusy(false);
          setDeleting(null);
        }}
      />

      <NotificationPrompt enabled={!!group && !preview} />
    </KeyboardAvoidingView>
  );
}
