// B4 Message actions — long-press sheet: quick reactions, the message itself,
// then Reply / Copy / Report / Block / Delete.

import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icon";
import { clock } from "@/lib/format";
import type { LocalMessage } from "@/lib/useConversation";
import { INK, ORANGE, useTheme } from "@/theme/tokens";

// Reactions are member content, like message text. These five are the
// design's quick row; the server accepts any short emoji.
export const QUICK_REACTIONS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F64F}", "\u{1F602}", "\u{1F389}"];

export function MessageActions({
  message,
  canDelete,
  onClose,
  onReact,
  onReply,
  onCopy,
  onReport,
  onBlock,
  onDelete,
}: {
  message: LocalMessage | null;
  canDelete: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  const t = useTheme();
  const m = message;
  return (
    <Modal visible={!!m} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} />
      {m ? (
        <View pointerEvents="box-none" style={{ flex: 1, justifyContent: "center", paddingHorizontal: 16, gap: 10, alignItems: m.mine ? "flex-end" : "flex-start" }}>
          <View style={[{ flexDirection: "row", gap: 2, padding: 5, borderRadius: 30, backgroundColor: t.sheet }, t.shadow]}>
            {QUICK_REACTIONS.map((e) => {
              const on = m.reactions.some((r) => r.emoji === e && r.mine);
              return (
                <Pressable key={e} onPress={() => onReact(e)} accessibilityLabel={`React ${e}`} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: on || pressed ? t.fill : "transparent" })}>
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[{ maxWidth: 300, borderRadius: 20, paddingTop: 8, paddingBottom: 9, paddingHorizontal: 14, gap: 2, backgroundColor: m.mine ? ORANGE : t.bubbleIn }, t.shadow]}>
            {!m.mine ? (
              <Text style={{ fontSize: 12, fontWeight: "600", color: t.muted }}>
                {m.sender?.displayName ?? "Former member"} · {clock(m.createdAt)}
              </Text>
            ) : null}
            <Text numberOfLines={6} style={{ fontSize: 17, lineHeight: 22, color: m.mine ? INK : t.text }}>
              {m.body ?? "Attachment"}
            </Text>
          </View>

          <View style={[{ width: 240, borderRadius: 22, backgroundColor: t.sheet, paddingVertical: 6, overflow: "hidden" }, t.shadow]}>
            <Action label="Reply" icon="reply" onPress={onReply} />
            {m.body ? <Action label="Copy" icon="copy" onPress={onCopy} /> : null}
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginVertical: 6 }} />
            {!m.mine ? <Action label="Report" icon="flag" onPress={onReport} tint /> : null}
            {!m.mine && m.sender ? <Action label={`Block ${m.sender.displayName.split(" ")[0]}`} icon="alertCircle" onPress={onBlock} tint /> : null}
            {canDelete ? <Action label="Delete" icon="trash" onPress={onDelete} tint /> : null}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

function Action({ label, icon, onPress, tint }: { label: string; icon: IconName; onPress: () => void; tint?: boolean }) {
  const t = useTheme();
  const color = tint ? t.tint : t.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, backgroundColor: pressed ? t.fill : "transparent" })}>
      <Text style={{ fontSize: 17, color }}>{label}</Text>
      <Icon name={icon} size={19} color={color} />
    </Pressable>
  );
}
