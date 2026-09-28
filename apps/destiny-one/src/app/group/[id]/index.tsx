// B3 Group chat — variant 1F "Avatars". Inverted list (newest at the bottom),
// floating glass header, and one of three footers: the composer, "Only admins
// can post here" (announcements), or the paused card (frozen group).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Composer } from "@/components/Composer";
import { Wallpaper } from "@/components/Wallpaper";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { MessageActions } from "@/components/MessageActions";
import { Divider, MessageBubble, buildRows, type Row } from "@/components/MessageBubble";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { Avatar, BackButton, ConfirmDialog, EmptyState, ErrorState, GlassIconButton, PrimaryButton, withAlpha } from "@/components/ui";
import { canSendAs } from "@destiny/shared";
import type { Account } from "@/lib/accounts";
import { plural } from "@/lib/format";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { hideSender, setOpenGroup } from "@/lib/queries";
import { uploadAttachment } from "@/lib/upload";
import { useConversation, type LocalMessage } from "@/lib/useConversation";
import { eventPick, useEventPick } from "@/state/eventPick";
import { pollDraft, usePollDraft } from "@/state/pollDraft";
import { errorMessage, useGroupSummary, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function GroupChat() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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
  const [actionFor, setActionFor] = useState<LocalMessage | null>(null);
  const [deleting, setDeleting] = useState<LocalMessage | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [blocking, setBlocking] = useState<{ id: string; name: string } | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<LocalMessage | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(() => (messages ? buildRows(messages, firstUnreadId).reverse() : []), [messages, firstUnreadId]);
  const byId = useMemo(() => new Map((messages ?? []).map((m) => [m.id, m])), [messages]);
  const admins = useMemo(() => new Set((group?.members ?? []).filter((m) => m.role === "admin").map((m) => m.id)), [group]);
  const tags = useMemo(() => new Map((group?.members ?? []).map((m) => [m.id, m.tag])), [group]);

  // While on screen, new messages here aren't unread.
  useFocusEffect(
    useCallback(() => {
      setOpenGroup(id);
      return () => setOpenGroup(null);
    }, [id]),
  );
  // Read receipts while the chat is on screen.
  useFocusEffect(useCallback(() => markRead(), [markRead]));

  useEffect(() => {
    if (!toast) return;
    haptic.error();
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // A poll composed, or an event chosen, on the modal screens that opened
  // from this one's attach sheet — sent as soon as it comes back.
  const { sendPoll, sendEvent } = convo;
  const draft = usePollDraft();
  useEffect(() => {
    if (!draft) return;
    pollDraft.clear();
    void sendPoll(draft).catch((err) => setToast(errorMessage(err, "Couldn't send the poll. Try again.")));
  }, [draft, sendPoll]);

  const chosenEvent = useEventPick();
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
  const sub = group ? [department, plural(group.members.length, "member")].filter(Boolean).join(" · ") : department ?? "";
  const canDelete = (m: LocalMessage) => m.mine || group?.myRole === "admin" || !!group?.canManage;

  async function sendText(text: string) {
    const reply = replyTo;
    setReplyTo(null);
    list.current?.scrollToOffset({ offset: 0, animated: true });
    await convo.send({ body: text, replyTo: reply?.id }).catch((err) => setToast(errorMessage(err)));
  }

  /** Holding Send: the other signed-in account sends this text (replies included). */
  async function sendTextAs(account: Account, text: string) {
    const reply = replyTo;
    await convo.sendAs(account.slot, { body: text, replyTo: reply?.id });
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
      await convo.send({ replyTo: reply?.id }, { file: { name: file.name, mimeType: file.mimeType, sizeBytes: file.size }, upload: () => uploadAttachment(id, file) });
    } catch (err) {
      setToast(errorMessage(err, "Couldn't send the file. Try again."));
    }
  }

  const footer = !group ? null : frozen || archived ? (
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
      ref={input}
      replying={replyTo ? { name: replyTo.mine ? "yourself" : replyTo.sender?.displayName ?? "Former member", text: replyTo.body ?? "Attachment" } : null}
      onCancelReply={() => setReplyTo(null)}
      onSend={sendText}
      loadSendAsOptions={sendAsEnabled ? convo.sendAsOptions : undefined}
      onSendAs={sendAsEnabled ? sendTextAs : undefined}
      onAttach={sendFile}
      onAttachPoll={() => router.push(`/group/${id}/poll`)}
      onAttachEvent={() => router.push(`/group/${id}/event-picker`)}
      onError={setToast}
    />
  );

  return (
    // "padding" on Android too: apps are edge-to-edge there now, so the window
    // no longer shrinks for the keyboard and the message box would be covered.
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      {t.wall ? <Wallpaper pattern={t.wall.def.pattern} tone={t.wall.tone} /> : null}
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
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.top + 70 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onEndReached={() => void convo.loadOlder()}
          onEndReachedThreshold={0.4}
          onScroll={(e) => setShowJump(e.nativeEvent.contentOffset.y > 400)}
          scrollEventThrottle={100}
          ListFooterComponent={convo.loadingOlder ? <ActivityIndicator color={ORANGE} style={{ paddingVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <EmptyState title="No messages yet" body={group?.canPost ? "Say hello." : undefined} />
            </View>
          }
          renderItem={({ item }) =>
            item.kind === "msg" ? (
              <MessageBubble
                row={item}
                replyTo={item.m.replyTo ? byId.get(item.m.replyTo) ?? null : null}
                senderTag={(item.m.sender && tags.get(item.m.sender.id)) || null}
                senderIsGroupAdmin={!!item.m.sender && admins.has(item.m.sender.id)}
                canReply={!!group?.canPost && !frozen && !archived}
                onReply={() => startReply(item.m)}
                onLongPress={() => setActionFor(item.m)}
                onOpenAttachment={(url) => {
                  // An event card carries its own web address; only files need a signed link.
                  if (!item.m.attachment) {
                    if (url) void WebBrowser.openBrowserAsync(url);
                    return;
                  }
                  // The cached link may have expired; attachmentUrl fetches a fresh one if so.
                  void convo.attachmentUrl(item.m).then((fresh) => {
                    if (fresh) void WebBrowser.openBrowserAsync(fresh);
                    else setToast("Couldn't open that file. Try again.");
                  });
                }}
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
            ) : (
              <Divider row={item} />
            )
          }
        />
      )}

      {/* Header: back · group pill (opens info) · search */}
      {t.wall ? null : <LinearGradient pointerEvents="none" colors={[t.bg, withAlpha(t.bg, 0)]} locations={[0.45, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 76 }} />}
      <View style={{ position: "absolute", top: insets.top, left: 0, right: 0, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
        <BackButton />
        <Pressable accessibilityRole="button" accessibilityLabel={`${name}, group info`} onPress={() => router.push(`/group/${id}/info`)} style={{ flexShrink: 1, marginHorizontal: 8 }}>
          {({ pressed }) => (
            <GlassSurface interactive style={[{ height: 48, maxWidth: 240, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 6, paddingRight: 16, opacity: pressed ? 0.8 : 1 }, t.shadow]}>
              <Avatar name={name} size={36} announcements={isAnnouncements} />
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: t.text }}>
                  {name}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: t.subtle }}>
                  {sub}
                </Text>
              </View>
            </GlassSurface>
          )}
        </Pressable>
        <GlassIconButton icon="search" label="Search" onPress={() => router.push("/search")} />
      </View>

      {/* Footer */}
      <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 12) }}>
        {toast ? (
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <GlassSurface style={{ borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 14, color: t.text }}>{toast}</Text>
            </GlassSurface>
          </View>
        ) : null}
        {showJump ? (
          <Pressable accessibilityLabel="Jump to latest" onPress={() => list.current?.scrollToOffset({ offset: 0, animated: true })} style={{ position: "absolute", right: 16, top: -52 }}>
            <GlassSurface interactive style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, t.shadow]}>
              <Icon name="chevronDown" size={20} color={t.text} strokeWidth={2.4} />
            </GlassSurface>
          </Pressable>
        ) : null}
        {footer}
      </View>

      <MessageActions
        message={actionFor}
        canDelete={!!actionFor && canDelete(actionFor)}
        onClose={() => setActionFor(null)}
        onReact={(emoji) => {
          const m = actionFor;
          setActionFor(null);
          if (m) void convo.toggleReaction(m.id, emoji).catch((err) => setToast(errorMessage(err)));
        }}
        onReply={() => {
          setReplyTo(actionFor);
          setActionFor(null);
          setTimeout(() => input.current?.focus(), 250);
        }}
        onCopy={() => {
          if (actionFor?.body) void Clipboard.setStringAsync(actionFor.body);
          setActionFor(null);
        }}
        onReport={() => {
          const m = actionFor;
          setActionFor(null);
          if (m) router.push({ pathname: "/report", params: { messageId: String(m.id), name: m.sender?.displayName ?? "Former member", at: m.createdAt, body: m.body ?? "Attachment" } });
        }}
        onBlock={() => {
          const sender = actionFor?.sender;
          setActionFor(null);
          if (sender) setBlocking({ id: sender.id, name: sender.displayName });
        }}
        onDelete={() => {
          setDeleting(actionFor);
          setActionFor(null);
        }}
      />

      <ConfirmDialog
        visible={!!blocking}
        title={`Block ${blocking?.name ?? ""}?`}
        body={`You won't see their messages or get notifications from them, and they won't be told. You both stay in your groups. The safeguarding team can still see everything, and can see that you blocked ${blocking?.name.split(" ")[0] ?? "them"}. If they've made you feel unsafe, report the message too.`}
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
        body="It will be removed for everyone. A copy is kept for a time in case safeguarding needs it."
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

      <NotificationPrompt enabled={!!group} />
    </KeyboardAvoidingView>
  );
}
