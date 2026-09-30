// B4 Message actions: press and hold a message. The chat dims, the message
// lifts out where it was, a bar of quick reactions sits above it (with "+"
// for more) and a card of actions sits below: Reply, Copy, Report,
// Block, Delete. Laid out by lib/menuLayout, so it always fits on screen and
// never covers the message.
//
// Drawn in React Native rather than as the system context menu: hosting each
// bubble in SwiftUI (to be the menu's preview) gave rows the wrong height, so
// messages and their reactions overlapped in the list.
//
// The bar and card are solid sheets in the app's own colours, not Liquid
// Glass: the menu looks the same on every phone, and the chat behind never
// shows through the labels.
//
// The bar and card spring out of the message's corner; with Reduce Motion on
// they fade. Tapping outside closes it at any point, and an action runs once
// the menu has gone, so Reply's keyboard doesn't fight the closing menu.

import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { reduceMotion, springs } from "@/components/Motion";
import { haptic } from "@/lib/haptics";
import { menuLayout, type Rect } from "@/lib/menuLayout";
import type { LocalMessage } from "@/lib/useConversation";
import { useTheme } from "@/theme/tokens";

// Reactions are member content, like message text. These six are the quick
// row; "+" opens the rest. The server accepts any short emoji.
export const QUICK_REACTIONS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];
export const MORE_REACTIONS = [
  "\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F606}", "\u{1F605}", "\u{1F923}",
  "\u{1F60A}", "\u{1F607}", "\u{1F642}", "\u{1F609}", "\u{1F60D}", "\u{1F970}", "\u{1F618}",
  "\u{1F60B}", "\u{1F61C}", "\u{1F917}", "\u{1F914}", "\u{1F92D}", "\u{1F62C}", "\u{1F644}",
  "\u{1F60C}", "\u{1F634}", "\u{1F60E}", "\u{1F973}", "\u{1F633}", "\u{1F97A}", "\u{1F62D}",
  "\u{1F631}", "\u{1F625}", "\u{1F614}", "\u{1F629}", "\u{1F624}", "\u{1F92F}", "\u{1FAE1}",
  "\u{1F44F}", "\u{1F64C}", "\u{1F450}", "\u{1F91D}", "\u{1F44C}", "\u{270C}\u{FE0F}", "\u{1F4AA}",
  "\u{1F44B}", "\u{1F440}", "\u{1F525}", "\u{2728}", "\u{1F389}", "\u{1F4AF}", "\u{2705}",
  "\u{1F9E1}", "\u{1F49B}", "\u{1F49A}", "\u{1F499}", "\u{1F49C}", "\u{1F90D}", "\u{1F494}",
  "\u{271D}\u{FE0F}", "\u{1F54A}\u{FE0F}", "\u{1F31F}", "\u{2600}\u{FE0F}", "\u{1F308}", "\u{1F381}", "\u{1F382}",
];

export interface MessageMenuActions {
  canDelete: boolean;
  onReact: (emoji: string) => void;
  onReply: (() => void) | null;
  onCopy: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
}

interface Item {
  label: string;
  icon: IconName;
  run: () => void;
  destructive?: boolean;
}

/** The actions this message offers, in order, split where the card draws a line. */
function items(m: LocalMessage, a: MessageMenuActions): Item[][] {
  const theirs = !m.mine;
  const everyday: Item[] = [];
  if (a.onReply) everyday.push({ label: "Reply", icon: "reply", run: a.onReply });
  if (m.body) everyday.push({ label: "Copy", icon: "copy", run: a.onCopy });
  const serious: Item[] = [];
  if (theirs) serious.push({ label: "Report", icon: "flag", run: a.onReport, destructive: true });
  if (theirs && m.sender) serious.push({ label: `Block ${m.sender.displayName.split(" ")[0]}`, icon: "block", run: a.onBlock, destructive: true });
  if (a.canDelete) serious.push({ label: "Delete", icon: "trash", run: a.onDelete, destructive: true });
  return [everyday, serious].filter((g) => g.length > 0);
}

// Sizes, so the layout is known before anything is drawn.
const CARD_W = 250;
const ROW_H = 50;
const CARD_PAD = 6;
const LINE = 13; // separator plus its margins
const CELL = 44;
const PLUS = 38;
const BAR_PAD = 6;
const PICKER_COLS = 7;
const PICKER_H = 264;

// iOS system red, for the destructive actions.
const RED = { light: "#FF3B30", dark: "#FF453A" };

export function MessageMenu({
  message: m,
  actions,
  anchor,
  onClose,
  children,
}: {
  message: LocalMessage;
  actions: MessageMenuActions;
  /** Where the bubble is on screen, from measureInWindow. */
  anchor: Rect;
  onClose: () => void;
  /** The bubble, drawn again above the dimmed chat. */
  children: ReactNode;
}) {
  const t = useTheme();
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [p] = useState(() => new Animated.Value(0));
  const red = t.dark ? RED.dark : RED.light;
  const surface = { overflow: "hidden", backgroundColor: t.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: t.sep } as const;

  const groups = items(m, actions);
  const rows = groups.reduce((n, g) => n + g.length, 0);

  // The quick row shrinks its cells on a narrow screen rather than running off it.
  const cell = Math.min(CELL, Math.floor((screen.width - 16 - BAR_PAD * 2 - PLUS - 4) / QUICK_REACTIONS.length));
  const bar = { w: cell * QUICK_REACTIONS.length + PLUS + 4 + BAR_PAD * 2, h: cell + BAR_PAD * 2 };
  const actionsH = rows * ROW_H + (groups.length - 1) * LINE + CARD_PAD * 2;
  const card = { w: picking ? Math.min(screen.width - 16, CELL * PICKER_COLS + CARD_PAD * 2 + 10) : CARD_W, h: picking ? PICKER_H : actionsH };

  const layout = menuLayout({ bubble: anchor, screen: { w: screen.width, h: screen.height }, insets, mine: m.mine, bar, card });

  useEffect(() => {
    if (reduceMotion()) Animated.timing(p, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    else Animated.spring(p, { toValue: 1, ...springs.enter, stiffness: 340, useNativeDriver: true }).start();
  }, [p]);

  /** Fade out, then do the thing (if any). */
  function close(then?: () => void) {
    if (closing) return;
    setClosing(true);
    Animated.timing(p, { toValue: 0, duration: reduceMotion() ? 100 : 160, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      onClose();
      then?.();
    });
  }

  function react(emoji: string) {
    haptic.selection();
    close(() => actions.onReact(emoji));
  }

  const move = !reduceMotion();
  const pop = (origin: "top" | "bottom") => ({
    opacity: p,
    transformOrigin: `${m.mine ? "right" : "left"} ${origin}`,
    transform: move ? [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] : [],
  });
  // The bubble glides from where it was to where the menu needs it, and back on close.
  const lift = {
    transform: move
      ? [
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [anchor.y - layout.bubble.y, 0] }) },
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ]
      : [],
  };
  const mine = (emoji: string) => m.reactions.some((r) => r.emoji === emoji && r.mine);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close()}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.dark ? "rgba(0,0,0,0.55)" : "rgba(14,16,19,0.32)", opacity: p }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={() => close()} style={StyleSheet.absoluteFill} />

      {/* The message, lifted. Not touchable: it's here to show what the menu is for. */}
      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[{ position: "absolute", left: layout.bubble.x, top: layout.bubble.y, width: anchor.w, height: layout.bubble.h, overflow: layout.bubble.clipped ? "hidden" : "visible", borderRadius: layout.bubble.clipped ? 20 : 0 }, lift]}
      >
        {children}
      </Animated.View>

      {/* Quick reactions */}
      <Animated.View style={[{ position: "absolute", left: layout.bar.x, top: layout.bar.y, borderRadius: bar.h / 2 }, t.shadow, pop("bottom")]}>
        <View style={[surface, { width: bar.w, height: bar.h, borderRadius: bar.h / 2, flexDirection: "row", alignItems: "center", paddingHorizontal: BAR_PAD }]}>
          {QUICK_REACTIONS.map((e) => (
            <Pressable
              key={e}
              onPress={() => react(e)}
              accessibilityRole="button"
              accessibilityLabel={`React ${e}`}
              accessibilityState={{ selected: mine(e) }}
              style={({ pressed }) => ({ width: cell, height: cell, borderRadius: cell / 2, alignItems: "center", justifyContent: "center", backgroundColor: mine(e) ? t.fill2 : "transparent", transform: [{ scale: pressed ? 1.25 : 1 }] })}
            >
              <Text allowFontScaling={false} style={{ fontSize: Math.round(cell * 0.64) }}>
                {e}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              haptic.selection();
              setPicking((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel={picking ? "Show actions" : "More reactions"}
            style={({ pressed }) => ({ marginLeft: 4, width: PLUS, height: PLUS, borderRadius: PLUS / 2, alignItems: "center", justifyContent: "center", backgroundColor: picking || pressed ? t.fill2 : t.fill })}
          >
            <Icon name={picking ? "close" : "plus"} size={20} color={t.text} strokeWidth={2.2} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Actions, or every reaction after "+" */}
      <Animated.View key={picking ? "picker" : "actions"} style={[{ position: "absolute", left: layout.card.x, top: layout.card.y, borderRadius: 26 }, t.shadow, pop("top")]}>
        <View style={[surface, { width: card.w, height: card.h, borderRadius: 26, paddingVertical: CARD_PAD }]}>
          {picking ? (
            <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: CARD_PAD + 4 }} showsVerticalScrollIndicator={false}>
              {MORE_REACTIONS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => react(e)}
                  accessibilityRole="button"
                  accessibilityLabel={`React ${e}`}
                  style={({ pressed }) => ({ width: CELL, height: CELL, borderRadius: CELL / 2, alignItems: "center", justifyContent: "center", backgroundColor: mine(e) || pressed ? t.fill2 : "transparent" })}
                >
                  <Text allowFontScaling={false} style={{ fontSize: 27 }}>
                    {e}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            groups.map((g, i) => (
              <View key={i}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, marginVertical: (LINE - StyleSheet.hairlineWidth) / 2, marginHorizontal: 18, backgroundColor: t.sep }} /> : null}
                {g.map((it) => (
                  <Pressable
                    key={it.label}
                    onPress={() => {
                      if (it.destructive) haptic.tick();
                      close(it.run);
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ height: ROW_H, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, marginHorizontal: CARD_PAD, borderRadius: 16, backgroundColor: pressed ? t.fill : "transparent" })}
                  >
                    <Icon name={it.icon} size={22} color={it.destructive ? red : t.text} strokeWidth={1.9} />
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ flexShrink: 1, fontSize: 17, color: it.destructive ? red : t.text }}>
                      {it.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}
