// Conversation variant 1F "Avatars": bubbles, with the sender's avatar beside
// the LAST message of each run and their name above the FIRST. Mine are
// orange on the right with the time underneath.

import { Image, Pressable, Text, View } from "react-native";
import type { D1Message } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { AdminTag, Avatar } from "@/components/ui";
import { clock, dayLabel, fileMeta, sameDay } from "@/lib/format";
import type { LocalMessage } from "@/lib/useConversation";
import { INK, ORANGE, useTheme } from "@/theme/tokens";

export type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "new"; key: string }
  | { kind: "msg"; key: string; m: LocalMessage; showName: boolean; showAvatar: boolean; gapTop: number };

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
    rows.push({
      kind: "msg",
      key: `m${m.id}`,
      m,
      showName: !m.mine && !samePrev,
      showAvatar: !m.mine && !sameNext,
      gapTop: samePrev || mineRun ? 3 : 12,
    });
  });
  return rows;
}

export function Divider({ row }: { row: Exclude<Row, { kind: "msg" }> }) {
  const t = useTheme();
  if (row.kind === "day") return <Text style={{ paddingTop: 14, paddingBottom: 4, textAlign: "center", fontSize: 12, fontWeight: "600", color: t.subtle }}>{row.label}</Text>;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 16, paddingHorizontal: 16 }}>
      <View style={{ flex: 1, height: 0.5, backgroundColor: ORANGE, opacity: 0.6 }} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: t.tint }}>New messages</Text>
      <View style={{ flex: 1, height: 0.5, backgroundColor: ORANGE, opacity: 0.6 }} />
    </View>
  );
}

interface BubbleProps {
  row: Extract<Row, { kind: "msg" }>;
  replyTo: D1Message | null;
  senderIsAdmin: boolean;
  onLongPress: () => void;
  onOpenAttachment: (url: string) => void;
  onToggleReaction: (emoji: string) => void;
  onRetry: () => void;
}

export function MessageBubble({ row, replyTo, senderIsAdmin, onLongPress, onOpenAttachment, onToggleReaction, onRetry }: BubbleProps) {
  const t = useTheme();
  const { m } = row;
  const name = m.mine ? "You" : m.sender?.displayName ?? "Former member";
  const replyName = replyTo ? (replyTo.mine ? "You" : replyTo.sender?.displayName ?? "Former member") : "";
  const replyText = replyTo ? (replyTo.deleted ? "Message deleted" : replyTo.body ?? "Attachment") : "";

  const body = m.deleted ? (
    <View style={{ borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: t.sep, paddingVertical: 7, paddingHorizontal: 14 }}>
      <Text style={{ fontSize: 15, fontStyle: "italic", color: t.subtle }}>This message was deleted</Text>
    </View>
  ) : (
    <Pressable
      onLongPress={m.id > 0 ? onLongPress : undefined}
      onPress={m.status === "failed" ? onRetry : undefined}
      delayLongPress={300}
      accessibilityHint={m.id > 0 ? "Long press for reply, react, copy and report" : undefined}
      style={{ maxWidth: "100%", opacity: m.status === "sending" ? 0.6 : 1 }}
    >
      <View style={{ borderRadius: 20, backgroundColor: m.mine ? ORANGE : t.bubbleIn, paddingTop: 8, paddingBottom: 9, paddingHorizontal: 14, gap: 6 }}>
        {replyTo ? (
          <View style={{ marginTop: 2, marginHorizontal: -6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 13, backgroundColor: m.mine ? "rgba(14,16,19,0.1)" : t.bg, gap: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: m.mine ? "700" : "600", color: m.mine ? INK : t.tint }}>{replyName}</Text>
            <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 18, color: m.mine ? INK : t.muted }}>
              {replyText}
            </Text>
          </View>
        ) : null}
        <Attachment m={m} onOpen={onOpenAttachment} />
        {m.body ? <Text style={{ fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: m.mine ? INK : t.text }}>{m.body}</Text> : null}
      </View>
    </Pressable>
  );

  const reactions =
    !m.deleted && m.reactions.length ? (
      <View style={{ flexDirection: "row", gap: 4, marginTop: -8, [m.mine ? "marginRight" : "marginLeft"]: 10 }}>
        {m.reactions.map((r) => (
          <Pressable
            key={r.emoji}
            onPress={() => onToggleReaction(r.emoji)}
            accessibilityLabel={`${r.emoji} ${r.count}${r.mine ? ", including you" : ""}`}
            style={{ height: 26, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, backgroundColor: r.mine ? t.accentSoft : t.card, borderWidth: 1, borderColor: r.mine ? ORANGE : t.glassLine }}
          >
            <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }}>{r.count}</Text>
          </Pressable>
        ))}
      </View>
    ) : null;

  if (m.mine) {
    return (
      <View style={{ alignItems: "flex-end", gap: 3, paddingTop: row.gapTop, paddingRight: 12, paddingLeft: 64 }}>
        {body}
        {reactions}
        <Text style={{ paddingHorizontal: 6, fontSize: 11, color: m.status === "failed" ? t.tint : t.subtle }}>
          {m.status === "sending" ? "Sending..." : m.status === "failed" ? "Not sent. Tap to retry." : clock(m.createdAt)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: row.gapTop, paddingRight: 56, paddingLeft: 12 }}>
      <View style={{ width: 30, marginBottom: 2 }}>{row.showAvatar ? <Avatar name={name} size={30} /> : null}</View>
      <View style={{ flexShrink: 1, alignItems: "flex-start", gap: 3, minWidth: 0 }}>
        {row.showName ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.muted }}>{name}</Text>
            {senderIsAdmin ? <AdminTag /> : null}
            <Text style={{ fontSize: 12, color: t.subtle }}>{clock(m.createdAt)}</Text>
          </View>
        ) : null}
        {body}
        {reactions}
      </View>
    </View>
  );
}

function Attachment({ m, onOpen }: { m: LocalMessage; onOpen: (url: string) => void }) {
  const t = useTheme();
  const a = m.attachment;
  const local = m.localAttachment;
  if (!a && !local) return null;
  const mime = a?.mimeType ?? local?.mimeType ?? "";
  const url = a?.url ?? null;

  if (mime.startsWith("image/") && url) {
    return (
      <Pressable onPress={() => onOpen(url)} accessibilityRole="imagebutton" accessibilityLabel="Photo. Opens full screen." style={{ marginTop: 2, marginHorizontal: -8 }}>
        <Image source={{ uri: url }} style={{ width: 220, height: 220, borderRadius: 14, backgroundColor: t.fill }} resizeMode="cover" />
      </Pressable>
    );
  }

  const fileName = local?.name ?? (mime === "application/pdf" ? "PDF document" : mime.startsWith("image/") ? "Photo" : "File");
  return (
    <Pressable
      disabled={!url}
      onPress={() => url && onOpen(url)}
      accessibilityRole="button"
      style={{ marginTop: 2, marginHorizontal: -6, padding: 8, borderRadius: 13, backgroundColor: m.mine ? "rgba(14,16,19,0.1)" : t.bg, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 210 }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: t.avatar, alignItems: "center", justifyContent: "center" }}>
        <Icon name="doc" size={18} color="#FFFFFF" strokeWidth={1.9} />
      </View>
      <View style={{ gap: 1, flexShrink: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: m.mine ? INK : t.text }}>
          {fileName}
        </Text>
        <Text style={{ fontSize: 12, color: m.mine ? INK : t.subtle }}>{m.status === "sending" ? "Uploading..." : fileMeta(mime, a?.sizeBytes ?? local?.sizeBytes ?? null)}</Text>
      </View>
    </Pressable>
  );
}
