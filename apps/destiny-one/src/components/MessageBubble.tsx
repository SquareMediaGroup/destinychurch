// Conversation variant 1F "Avatars": bubbles, with the sender's avatar beside
// the LAST message of each run and their name above the FIRST. Mine are in
// the person's own send colour (src/theme/appearance.ts) on the right, with
// the time underneath.
//
// Bubbles in a run are joined: the corner facing the sender flattens between
// neighbours, and the last one in the run gets a small tail, as in Apple's
// Messages. Swipe a message right to reply; press and hold for the menu.

import { useEffect, useState, type ReactNode } from "react";
import { Animated, Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { D1EventContent, D1LeaderRole, D1Message, D1PollContent } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { MessageMenu, type MessageMenuActions } from "@/components/MessageMenu";
import { Appear, Pop, PressableScale, reduceMotion, springs } from "@/components/Motion";
import { SwipeToReply } from "@/components/Swipe";
import { Avatar, MemberTag, withAlpha } from "@/components/ui";
import { clock, dayLabel, eventWhen, fileMeta, plural, sameDay } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { LocalMessage } from "@/lib/useConversation";
import { PHOTO_CHIP_ALPHA } from "@/theme/appearance";
import { ORANGE, useTheme, type Theme } from "@/theme/tokens";

const RADIUS = 20;
const JOINED = 6;
const TAIL_W = 12;
const TAIL_H = 19;

/**
 * Text that sits straight on a photo wallpaper (times, names, dividers) goes on
 * a near-opaque chip in the page colour, so it stays readable over any photo.
 * The tests check that chip against pure black and pure white behind it.
 */
export function photoChip(t: Theme) {
  return t.photo ? ({ overflow: "hidden", borderRadius: 10, paddingVertical: 1, paddingHorizontal: 6, backgroundColor: withAlpha(t.bg, PHOTO_CHIP_ALPHA) } as const) : null;
}

export type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "new"; key: string }
  | { kind: "msg"; key: string; m: LocalMessage; showName: boolean; showAvatar: boolean; gapTop: number; joinAbove: boolean; joinBelow: boolean };

/** Messages (oldest first) → display rows (oldest first), with day and unread dividers. */
export function buildRows(messages: LocalMessage[], firstUnreadId: number | null): Row[] {
  const rows: Row[] = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || !sameDay(prev.createdAt, m.createdAt)) rows.push({ kind: "day", key: `d${m.createdAt.slice(0, 10)}`, label: dayLabel(m.createdAt) });
    if (m.id === firstUnreadId) rows.push({ kind: "new", key: "new" });
    // A run is consecutive messages from one person on one day, broken by the unread divider.
    const sameSender = (o?: LocalMessage) => !!o && !o.mine && !m.mine && o.sender?.id === m.sender?.id && sameDay(o.createdAt, m.createdAt);
    const samePrev = sameSender(prev) && m.id !== firstUnreadId;
    const sameNext = sameSender(next) && next.id !== firstUnreadId;
    const mineRun = !!prev && prev.mine && m.mine && sameDay(prev.createdAt, m.createdAt);
    const mineNext = !!next && next.mine && m.mine && sameDay(next.createdAt, m.createdAt);
    rows.push({
      kind: "msg",
      key: `m${m.id}`,
      m,
      showName: !m.mine && !samePrev,
      showAvatar: !m.mine && !sameNext,
      gapTop: samePrev || mineRun ? 3 : 12,
      joinAbove: samePrev || mineRun,
      joinBelow: sameNext || mineNext,
    });
  });
  return rows;
}

export function Divider({ row }: { row: Exclude<Row, { kind: "msg" }> }) {
  const t = useTheme();
  if (row.kind === "day") {
    // A small chip, so the label stays readable over a wallpaper.
    return (
      <View style={{ alignItems: "center", paddingTop: 14, paddingBottom: 4 }}>
        <Text style={{ overflow: "hidden", borderRadius: 11, paddingVertical: 3, paddingHorizontal: 10, fontSize: 12, fontWeight: "600", color: t.muted, backgroundColor: t.photo ? withAlpha(t.bg, PHOTO_CHIP_ALPHA) : t.wall ? t.glass : "transparent" }}>{row.label}</Text>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 16, paddingHorizontal: 16 }}>
      <View style={{ flex: 1, height: 0.5, backgroundColor: ORANGE, opacity: 0.6 }} />
      <Text style={[{ fontSize: 12, fontWeight: "600", color: t.tint }, photoChip(t)]}>New messages</Text>
      <View style={{ flex: 1, height: 0.5, backgroundColor: ORANGE, opacity: 0.6 }} />
    </View>
  );
}

interface BubbleProps {
  row: Extract<Row, { kind: "msg" }>;
  replyTo: D1Message | null;
  /** The sender's account role, if any. */
  senderTag: D1LeaderRole | null;
  senderIsGroupAdmin: boolean;
  /** False where posting isn't allowed (announcements, paused groups). */
  canReply: boolean;
  /** Just sent or just received while the chat is open: it springs in instead of simply being there. */
  arriving?: boolean;
  /** What the press-and-hold menu does. Not shown for unsent or deleted messages. */
  menu: MessageMenuActions;
  onReply: () => void;
  onOpenAttachment: (url: string) => void;
  onToggleReaction: (emoji: string) => void;
  onVotePoll: (optionIds: string[]) => void;
  onRetry: () => void;
}

/** The little curl at the bottom of the last bubble in a run. Same fill as the bubble, drawn outside its corner. */
export function Tail({ color, mine }: { color: string; mine: boolean }) {
  // Edge of the bubble curving out to a point, then back under: the same curl as Messages.
  const d = mine
    ? `M0 0 C0 10 3.5 15 12 17.5 C7.5 19 2.5 18.5 0 16.5 Z`
    : `M12 0 C12 10 8.5 15 0 17.5 C4.5 19 9.5 18.5 12 16.5 Z`;
  return (
    <Svg width={TAIL_W} height={TAIL_H} pointerEvents="none" style={{ position: "absolute", bottom: 0, [mine ? "right" : "left"]: -TAIL_W + 1 }}>
      <Path d={d} fill={color} />
    </Svg>
  );
}

/**
 * Text and panel colours for whichever side the bubble is on. Panels and poll
 * bars inside a sent bubble shade the fill in the direction that raises the
 * text's contrast (darker under white text, lighter under dark text), never
 * the other way.
 */
function tones(t: Theme, mine: boolean) {
  const shade = (a: number) => (t.onSend === "#FFFFFF" ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a + 0.1})`);
  return mine
    ? { text: t.onSend, soft: t.onSend, panel: t.onSendCard, track: shade(0.12), bar: shade(0.22), barMine: shade(0.42), name: t.onSend }
    : { text: t.text, soft: t.muted, panel: t.bg, track: t.fill, bar: t.accentSoft, barMine: ORANGE, name: t.tint };
}

export function MessageBubble({ row, replyTo, senderTag, senderIsGroupAdmin, canReply, arriving, menu, onReply, onOpenAttachment, onToggleReaction, onVotePoll, onRetry }: BubbleProps) {
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const { m } = row;
  const k = tones(t, m.mine);
  // The press-and-hold menu hosts the bubble in SwiftUI, where a percentage
  // max width has no parent to resolve against, so text lays out at the wrong
  // width and the row reports the wrong height (rows and reactions overlap).
  // Give it the width the row would have given it, in points. Rows pad 78pt
  // on mine, 110pt on theirs (avatar column and gutters).
  const maxBubbleW = Math.max(120, screenW - (m.mine ? 78 : 110));
  const name = m.mine ? "You" : m.sender?.displayName ?? "Former member";
  const replyName = replyTo ? (replyTo.mine ? "You" : replyTo.sender?.displayName ?? "Former member") : "";
  const replyText = replyTo ? (replyTo.deleted ? "Message deleted" : replyTo.body ?? "Attachment") : "";

  // Joined runs flatten the corner facing the sender; the last bubble gets a tail instead.
  const tail = !m.deleted && !row.joinBelow && (m.mine || row.showAvatar);
  const side = m.mine ? "Right" : "Left";
  const corners = {
    borderRadius: RADIUS,
    [`borderTop${side}Radius`]: row.joinAbove ? JOINED : RADIUS,
    [`borderBottom${side}Radius`]: tail ? 0 : row.joinBelow ? JOINED : RADIUS,
  };

  const body = m.deleted ? (
    <View style={{ borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: t.sep, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: t.photo ? withAlpha(t.bg, PHOTO_CHIP_ALPHA) : t.wall ? t.glass : "transparent" }}>
      <Text style={{ fontSize: 15, fontStyle: "italic", color: t.muted }}>This message was deleted</Text>
    </View>
  ) : (
    <PressableScale
      onPress={m.status === "failed" ? onRetry : undefined}
      scaleTo={0.94}
      accessibilityHint={m.id > 0 ? "Long press for reply, react, copy and report" : undefined}
      wrapStyle={{ maxWidth: maxBubbleW }}
      style={{ opacity: m.status === "sending" ? 0.6 : 1 }}
    >
      <View style={{ ...corners, backgroundColor: m.mine ? t.send : t.bubbleIn, paddingTop: 8, paddingBottom: 9, paddingHorizontal: 14, gap: 6 }}>
        {replyTo ? (
          <View style={{ marginTop: 2, marginHorizontal: -6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 13, backgroundColor: k.panel, gap: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: k.name }}>{replyName}</Text>
            <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 18, color: k.soft }}>
              {replyText}
            </Text>
          </View>
        ) : null}
        <Attachment m={m} onOpen={onOpenAttachment} />
        {m.content?.kind === "event" ? <EventCard content={m.content} mine={m.mine} onOpen={onOpenAttachment} /> : null}
        {m.content?.kind === "poll" ? <PollCard content={m.content} mine={m.mine} onVote={onVotePoll} /> : null}
        {m.body ? <Text style={{ fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: k.text }}>{m.body}</Text> : null}
      </View>
      {tail ? <Tail color={m.mine ? t.send : t.bubbleIn} mine={m.mine} /> : null}
    </PressableScale>
  );

  // Sent messages get the system press-and-hold menu; unsent and deleted ones have nothing to act on.
  const shown = !m.deleted && m.id > 0 ? <MessageMenu message={m} actions={menu}>{body}</MessageMenu> : body;

  const reactions =
    !m.deleted && m.reactions.length ? (
      <View style={{ flexDirection: "row", gap: 4, marginTop: -8, [m.mine ? "marginRight" : "marginLeft"]: 10 }}>
        {m.reactions.map((r) => (
          <Appear key={r.emoji} from={{ scale: 0.3 }}>
            <Pop value={r.count}>
              <PressableScale
                onPress={() => {
                  haptic.selection();
                  onToggleReaction(r.emoji);
                }}
                scaleTo={0.85}
                accessibilityLabel={`${r.emoji} ${r.count}${r.mine ? ", including you" : ""}`}
                style={{ minHeight: 26, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, backgroundColor: r.mine ? t.accentSoft : t.card, borderWidth: 1, borderColor: r.mine ? ORANGE : t.glassLine }}
              >
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14 }}>{r.emoji}</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "600", color: t.text }}>{r.count}</Text>
              </PressableScale>
            </Pop>
          </Appear>
        ))}
      </View>
    ) : null;

  const swipeable = canReply && m.id > 0 && !m.deleted;

  // Sent bubbles rise from the composer; received ones slide in from their sender's side.
  const enter = (content: ReactNode) =>
    arriving ? (
      <Appear once={`msg:${m.groupId}:${m.id}`} from={m.mine ? { y: 36, x: 10, scale: 0.9 } : { x: -18, y: 10, scale: 0.92 }}>
        {content}
      </Appear>
    ) : (
      content
    );

  if (m.mine) {
    return enter(
      <SwipeToReply enabled={swipeable} onReply={onReply}>
        <View style={{ alignItems: "flex-end", gap: 3, paddingTop: row.gapTop, paddingRight: 14, paddingLeft: 64 }}>
          {shown}
          {reactions}
          {/* The time only shows under the last bubble of a run, like Messages. */}
          {!row.joinBelow || m.status ? (
            <Text style={[{ paddingHorizontal: 6, fontSize: 11, color: m.status === "failed" ? t.tint : t.muted }, photoChip(t)]}>
              {m.status === "sending" ? "Sending..." : m.status === "failed" ? "Not sent. Tap to retry." : clock(m.createdAt)}
            </Text>
          ) : null}
        </View>
      </SwipeToReply>,
    );
  }

  return enter(
    <SwipeToReply enabled={swipeable} onReply={onReply}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, paddingTop: row.gapTop, paddingRight: 56, paddingLeft: 12 }}>
        <View style={{ width: 30, marginBottom: 2 }}>{row.showAvatar ? <Avatar name={name} size={30} /> : null}</View>
        <View style={{ flexShrink: 1, alignItems: "flex-start", gap: 3, minWidth: 0 }}>
          {row.showName ? (
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 }, photoChip(t)]}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: t.muted }}>{name}</Text>
              <MemberTag tag={senderTag} groupAdmin={senderIsGroupAdmin} />
              <Text style={{ fontSize: 12, color: t.muted }}>{clock(m.createdAt)}</Text>
            </View>
          ) : null}
          {shown}
          {reactions}
        </View>
      </View>
    </SwipeToReply>,
  );
}

function Attachment({ m, onOpen }: { m: LocalMessage; onOpen: (url: string) => void }) {
  const t = useTheme();
  const k = tones(t, m.mine);
  const a = m.attachment;
  const local = m.localAttachment;
  if (!a && !local) return null;
  const mime = a?.mimeType ?? local?.mimeType ?? "";
  const url = a?.url ?? null;

  if (mime.startsWith("image/") && url) {
    return (
      <PressableScale onPress={() => onOpen(url)} accessibilityRole="imagebutton" accessibilityLabel="Photo. Opens full screen." scaleTo={0.97} wrapStyle={{ marginTop: 2, marginHorizontal: -8 }}>
        <Image source={{ uri: url }} style={{ width: 220, height: 220, borderRadius: 14, backgroundColor: t.fill }} resizeMode="cover" />
      </PressableScale>
    );
  }

  const fileName = local?.name ?? (mime === "application/pdf" ? "PDF document" : mime.startsWith("image/") ? "Photo" : "File");
  return (
    <Pressable
      disabled={!url}
      onPress={() => url && onOpen(url)}
      accessibilityRole="button"
      style={{ marginTop: 2, marginHorizontal: -6, padding: 8, borderRadius: 13, backgroundColor: k.panel, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 210 }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: t.avatar, alignItems: "center", justifyContent: "center" }}>
        <Icon name="doc" size={18} color="#FFFFFF" strokeWidth={1.9} />
      </View>
      <View style={{ gap: 1, flexShrink: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: k.text }}>
          {fileName}
        </Text>
        <Text style={{ fontSize: 12, color: k.soft }}>{m.status === "sending" ? "Uploading..." : fileMeta(mime, a?.sizeBytes ?? local?.sizeBytes ?? null)}</Text>
      </View>
    </Pressable>
  );
}

function EventCard({ content, mine, onOpen }: { content: D1EventContent; mine: boolean; onOpen: (url: string) => void }) {
  const t = useTheme();
  const k = tones(t, mine);
  const { event } = content;
  return (
    <Pressable
      disabled={!event.webUrl}
      onPress={() => event.webUrl && onOpen(event.webUrl)}
      accessibilityRole="button"
      style={{ marginTop: 2, marginHorizontal: -6, borderRadius: 14, overflow: "hidden", backgroundColor: k.panel, minWidth: 220 }}
    >
      {event.imageUrl ? <Image source={{ uri: event.imageUrl }} style={{ width: "100%", height: 120 }} resizeMode="cover" /> : null}
      <View style={{ padding: 10, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="calendar" size={13} color={k.name} strokeWidth={2.2} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: k.name }}>Event</Text>
        </View>
        <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "600", color: k.text }}>
          {event.name}
        </Text>
        <Text style={{ fontSize: 13, color: k.soft }}>
          {eventWhen(event.startsAt)}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

function PollCard({ content, mine, onVote }: { content: D1PollContent; mine: boolean; onVote: (optionIds: string[]) => void }) {
  const t = useTheme();
  const k = tones(t, mine);
  const { poll } = content;
  const total = poll.totalVoters;

  function tap(optionId: string) {
    haptic.selection();
    const selected = poll.myOptionIds.includes(optionId);
    if (poll.allowMultiple) {
      onVote(selected ? poll.myOptionIds.filter((id) => id !== optionId) : [...poll.myOptionIds, optionId]);
    } else {
      onVote(selected ? [] : [optionId]);
    }
  }

  return (
    <View style={{ marginTop: 2, marginHorizontal: -6, borderRadius: 14, backgroundColor: k.panel, padding: 10, gap: 8, minWidth: 220 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="poll" size={13} color={k.name} strokeWidth={2.2} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: k.name }}>{poll.allowMultiple ? "Poll · choose any" : "Poll"}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: "600", color: k.text }}>{poll.question}</Text>
      <View style={{ gap: 6 }}>
        {poll.options.map((o) => {
          const count = poll.votes.find((v) => v.optionId === o.id)?.count ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const mineVote = poll.myOptionIds.includes(o.id);
          return (
            <PressableScale
              key={o.id}
              onPress={() => tap(o.id)}
              accessibilityRole="button"
              accessibilityLabel={`${o.label}, ${pct}%${mineVote ? ", your choice" : ""}`}
              scaleTo={0.97}
              style={{ borderRadius: 10, overflow: "hidden", backgroundColor: k.track }}
            >
              <PollBar pct={pct} color={mineVote ? k.barMine : k.bar} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 10 }}>
                <Text numberOfLines={2} style={{ flex: 1, fontSize: 14, fontWeight: mineVote ? "700" : "400", color: k.text }}>
                  {o.label}
                </Text>
                <Text style={{ fontSize: 12, color: k.soft, marginLeft: 8 }}>{count > 0 ? `${pct}%` : ""}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Text style={{ fontSize: 11, color: k.soft }}>{total === 0 ? "No votes yet" : plural(total, "vote")}</Text>
    </View>
  );
}

/** A poll option's fill, springing to its new share when the votes change. */
function PollBar({ pct, color }: { pct: number; color: string }) {
  const [w] = useState(() => new Animated.Value(pct));
  useEffect(() => {
    if (reduceMotion()) w.setValue(pct);
    // Width can't run on the native driver; it's one small bar, so that's fine.
    else Animated.spring(w, { toValue: pct, ...springs.enter, useNativeDriver: false }).start();
  }, [pct, w]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"], extrapolate: "clamp" });
  return <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width, backgroundColor: color }} />;
}
