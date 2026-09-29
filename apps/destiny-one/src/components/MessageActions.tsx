// B4 Message actions — long-press sheet: quick reactions, the message itself,
// then Reply / Copy / Report / Block / Delete.
//
// It springs up from the side the message sits on (mine from the right,
// theirs from the left) and leaves the same way, so the menu reads as coming
// from the message. Nothing locks while it moves: tapping the backdrop closes
// it at any point. With Reduce Motion on it just appears.

import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icon";
import { clock } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { LocalMessage } from "@/lib/useConversation";
import { useTheme } from "@/theme/tokens";

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
  // Keep showing the last message while the menu animates out.
  const [held, setHeld] = useState<LocalMessage | null>(null);
  const [p] = useState(() => new Animated.Value(0));
  const m = message ?? held;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (message) {
        setHeld(message);
        if (reduce) p.setValue(1);
        else Animated.spring(p, { toValue: 1, stiffness: 380, damping: 32, mass: 1, useNativeDriver: true }).start();
      } else if (reduce) {
        p.setValue(0);
        setHeld(null);
      } else {
        Animated.spring(p, { toValue: 0, stiffness: 420, damping: 40, mass: 1, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setHeld(null);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [message, p]);

  const fromSide = m?.mine ? 1 : -1;
  const enter = {
    opacity: p,
    transform: [
      { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [28 * fromSide, 0] }) },
      { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
    ],
  };

  return (
    <Modal visible={!!m} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim, opacity: p }]} />
      <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
      {m ? (
        <Animated.View pointerEvents="box-none" style={[{ flex: 1, justifyContent: "center", paddingHorizontal: 16, gap: 10, alignItems: m.mine ? "flex-end" : "flex-start" }, enter]}>
          <View style={[{ flexDirection: "row", gap: 2, padding: 5, borderRadius: 30, backgroundColor: t.sheet }, t.shadow]}>
            {QUICK_REACTIONS.map((e) => {
              const on = m.reactions.some((r) => r.emoji === e && r.mine);
              return (
                <Pressable
                  key={e}
                  onPress={() => {
                    haptic.selection();
                    onReact(e);
                  }}
                  accessibilityLabel={`React ${e}`}
                  style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: on || pressed ? t.fill : "transparent", transform: [{ scale: pressed ? 1.15 : 1 }] })}
                >
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[{ maxWidth: 300, borderRadius: 20, paddingTop: 8, paddingBottom: 9, paddingHorizontal: 14, gap: 2, backgroundColor: m.mine ? t.send : t.bubbleIn }, t.shadow]}>
            {!m.mine ? (
              <Text style={{ fontSize: 12, fontWeight: "600", color: t.muted }}>
                {m.sender?.displayName ?? "Former member"} · {clock(m.createdAt)}
              </Text>
            ) : null}
            <Text numberOfLines={6} style={{ fontSize: 17, lineHeight: 22, color: m.mine ? t.onSend : t.text }}>
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
        </Animated.View>
      ) : null}
    </Modal>
  );
}

function Action({ label, icon, onPress, tint }: { label: string; icon: IconName; onPress: () => void; tint?: boolean }) {
  const t = useTheme();
  const color = tint ? t.tint : t.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, backgroundColor: pressed ? t.fill : "transparent" })}>
      <Text style={{ fontSize: 17, color }}>{label}</Text>
      <Icon name={icon} size={19} color={color} />
    </Pressable>
  );
}
