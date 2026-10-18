// Shared pieces for listing groups: ordering, the preview line, and the
// 1B card chat row.

import { Pressable, Text, View, type PressableProps } from "react-native";
import type { D1CommunitySummary, D1GroupSummary } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, BetaTag, CountBadge } from "@/components/ui";
import { listTime } from "@/lib/format";
import { useChatDraft } from "@/state/drafts";
import { useTheme } from "@/theme/tokens";

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

/** 1B "Cards" row: rounded-square avatar, count badge, one-line preview. */
// onPress is optional: inside a <Link asChild> the link supplies it.
export function CardGroupRow({ group, onPress, onPressIn, ...linkProps }: { group: D1GroupSummary; onPress?: () => void; onPressIn?: () => void } & Omit<PressableProps, "children" | "style">) {
  const t = useTheme();
  const unread = group.unreadCount > 0;
  const frozen = group.state === "frozen";
  const { who, line, italic } = previewParts(group);
  // Something half-written here takes the preview line's place, as in WhatsApp.
  const draft = useChatDraft(group.id).trim().split("\n", 1)[0];
  const label = [
    group.name,
    group.kind === "announcements" ? "announcements" : null,
    frozen ? "paused" : null,
    group.muted ? "muted" : null,
    unread ? `${group.unreadCount} unread` : null,
    draft ? `Draft: ${draft}` : `${who}${line}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      {...linkProps}
      onPress={onPress}
      onPressIn={onPressIn}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 14, backgroundColor: pressed ? t.fill : "transparent" })}
    >
      <Avatar name={group.name} size={44} radius={14} announcements={group.kind === "announcements"} assistant={group.kind === "assistant"} uri={group.iconUrl} />
      <View style={{ flex: 1, minWidth: 0, gap: 1, paddingVertical: 12, paddingRight: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: "600", color: t.text }}>
            {group.name}
          </Text>
          {group.kind === "assistant" ? <BetaTag /> : null}
          <View style={{ flex: 1 }} />
          {group.lastMessage ? <Text style={{ fontSize: 13, color: unread ? t.tint : t.subtle }}>{listTime(group.lastMessage.createdAt)}</Text> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, lineHeight: 19, color: t.muted }}>
            {frozen ? <Text style={{ color: t.text, fontWeight: "600" }}>Paused · </Text> : null}
            {draft ? (
              <>
                <Text style={{ color: t.tint, fontWeight: "600" }}>Draft: </Text>
                {draft}
              </>
            ) : (
              <>
                {who}
                <Text style={{ fontStyle: italic ? "italic" : "normal" }}>{line}</Text>
              </>
            )}
          </Text>
          {group.muted ? <Icon name="bellOff" size={15} color={t.subtle} /> : null}
          {unread ? <CountBadge count={group.unreadCount} small /> : null}
        </View>
      </View>
    </Pressable>
  );
}
