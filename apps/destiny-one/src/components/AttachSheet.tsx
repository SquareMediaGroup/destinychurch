// The composer's "+" menu: a Liquid Glass panel that grows out of the + button
// (anchored to it, scaling up from its corner on a spring), with one row per
// option, an icon in a round well and a label, the rows following in a quick
// stagger. Tap outside or pick a row to close; it shrinks back into the button.
// On Android and older iOS the glass falls back to the app's solid surface.

import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon, type IconName } from "@/components/Icon";
import { reduceMotion } from "@/components/Motion";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

/** Where the + button is on screen (from measureInWindow), so the menu can grow out of it. */
export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  anchor: MenuAnchor | null;
  onClose: () => void;
  onPhotos: () => void;
  onCamera: () => void;
  onDocument: () => void;
  onPoll: () => void;
  onEvent: () => void;
}

const MENU_WIDTH = 260;
/** Open: lively, a hint of overshoot. Close: quick and flat, back into the button. */
const OPEN = { stiffness: 380, damping: 26, mass: 1 } as const;
const CLOSE = { stiffness: 520, damping: 40, mass: 1 } as const;

export function AttachSheet({ visible, anchor, onClose, onPhotos, onCamera, onDocument, onPoll, onEvent }: Props) {
  const t = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [p] = useState(() => new Animated.Value(0));
  // Mount as soon as it's asked for; unmount only once it has shrunk away.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    const done = ({ finished }: { finished: boolean }) => {
      if (finished && !visible) setMounted(false);
    };
    if (reduceMotion()) Animated.timing(p, { toValue: visible ? 1 : 0, duration: 160, useNativeDriver: true }).start(done);
    else Animated.spring(p, { toValue: visible ? 1 : 0, ...(visible ? OPEN : CLOSE), restDisplacementThreshold: 0.01, useNativeDriver: true }).start(done);
  }, [visible, mounted, p]);

  // Above the + button, left edges lined up; kept on screen whatever the anchor.
  const left = Math.min(Math.max(12, anchor?.x ?? 12), screenW - MENU_WIDTH - 12);
  const bottom = anchor ? screenH - anchor.y + 10 : 110;

  const items: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: "camera", label: "Camera", onPress: onCamera },
    { icon: "photo", label: "Photos", onPress: onPhotos },
    { icon: "doc", label: "Document", onPress: onDocument },
    { icon: "poll", label: "Poll", onPress: onPoll },
    { icon: "calendar", label: "Event", onPress: onEvent },
  ];

  // The glass itself is never faded (it stops rendering at opacity 0); it only scales. Its contents fade.
  const scale = reduceMotion() ? 1 : p.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] });
  const contentOpacity = p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1], extrapolate: "clamp" });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.18)", opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }) }]} />
      <Pressable accessibilityLabel="Close menu" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ position: "absolute", left, bottom, width: MENU_WIDTH, transformOrigin: "left bottom", transform: [{ scale }] }}>
        <GlassSurface style={[{ borderRadius: 32, paddingVertical: 10 }, t.shadow]}>
          <Animated.View accessibilityRole="menu" style={{ opacity: contentOpacity }}>
            {items.map((item, i) => (
              <Row key={item.label} {...item} index={i} count={items.length} progress={p} />
            ))}
          </Animated.View>
        </GlassSurface>
      </Animated.View>
    </Modal>
  );
}

function Row({ icon, label, onPress, index, count, progress }: { icon: IconName; label: string; onPress: () => void; index: number; count: number; progress: Animated.Value }) {
  const t = useTheme();
  // The bottom row (nearest the button) leads, the rest follow upwards.
  const lag = ((count - 1 - index) / count) * 0.35;
  const y = reduceMotion() ? 0 : progress.interpolate({ inputRange: [0, lag, Math.min(lag + 0.65, 1)], outputRange: [14, 14, 0], extrapolate: "clamp" });
  return (
    <Animated.View style={{ transform: [{ translateY: y }] }}>
      <Pressable
        accessibilityRole="menuitem"
        accessibilityLabel={label}
        onPress={() => {
          haptic.selection();
          onPress();
        }}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 8, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 22, backgroundColor: pressed ? t.fill : "transparent" })}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.dark ? "rgba(255,255,255,0.1)" : "rgba(14,16,19,0.06)", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={21} color={t.text} strokeWidth={1.9} />
        </View>
        <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 18, letterSpacing: -0.3, color: t.text }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
