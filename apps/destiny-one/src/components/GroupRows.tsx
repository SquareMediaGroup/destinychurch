// Shared pieces for listing groups: ordering, the preview line, and the
// compact 1C chat row.

import { Pressable, StyleSheet, Text, View } from "react-native";
import type { D1CommunitySummary, D1GroupSummary } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { listTime } from "@/lib/format";
import { ORANGE, useTheme } from "@/theme/tokens";

/** Announcements first, then the rest by latest activity. */
export function orderedGroups(c: D1CommunitySummary): D1GroupSummary[] {
  const at = (g: D1GroupSummary) => g.lastMessage?.createdAt ?? "";
  return [...c.groups].sort((a, b) => {
    if (a.id === c.announcementsGroupId) return -1;
    if (b.id === c.announcementsGroupId) return 1;
    return at(b).localeCompare(at(a));
  });
}

export function previewParts(g: D1GroupSummary): { who: string; line: string; italic: boolean } {
  const m = g.lastMessage;
  if (!m) return { who: "", line: "No messages yet", italic: false };
  const who = m.senderName ? `${m.senderName}: ` : "";
  if (m.deleted) return { who, line: "Message deleted", italic: true };
  if (m.preview) return { who, line: m.preview, italic: false };
  if (m.hasAttachment) return { who, line: "Attachment", italic: false };
  return { who, line: "", italic: false };
}

/** 1C "Compact" row: unread dot, bold name when unread, one-line preview. */
export function CompactGroupRow({ group, onPress }: { group: D1GroupSummary; onPress: () => void }) {
  const t = useTheme();
  const unread = group.unreadCount > 0;
  const frozen = group.state === "frozen";
  const { who, line, italic } = previewParts(group);
  const label = [
    group.name,
    group.kind === "announcements" ? "announcements" : null,
    frozen ? "paused" : null,
    group.muted ? "muted" : null,
    unread ? `${group.unreadCount} unread` : null,
    `${who}${line}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingLeft: 12, backgroundColor: pressed ? t.fill : t.bg })}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 18, backgroundColor: ORANGE, opacity: unread ? 1 : 0 }} />
      <View style={{ flex: 1, minWidth: 0, gap: 2, paddingVertical: 11, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {group.kind === "announcements" ? <Icon name="megaphone" size={16} color={t.tint} strokeWidth={2.2} /> : null}
          {frozen ? <Icon name="pause" size={14} color={t.text} strokeWidth={3} /> : null}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: unread ? "600" : "400", color: t.text }}>
            {group.name}
          </Text>
          {group.muted ? <Icon name="bellOff" size={14} color={t.subtle} /> : null}
          {group.lastMessage ? <Text style={{ fontSize: 15, color: t.subtle }}>{listTime(group.lastMessage.createdAt)}</Text> : null}
          <Icon name="chevronRight" size={12} color={t.subtle} strokeWidth={2.6} />
        </View>
        <Text numberOfLines={1} style={{ fontSize: 15, lineHeight: 20, color: t.muted }}>
          {frozen ? <Text style={{ color: t.text, fontWeight: "600" }}>Paused · </Text> : null}
          {who}
          <Text style={{ fontStyle: italic ? "italic" : "normal" }}>{line}</Text>
        </Text>
      </View>
    </Pressable>
  );
}
