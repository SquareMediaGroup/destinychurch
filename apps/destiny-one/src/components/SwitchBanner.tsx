// The small notice that slides down after switching account: "Switched to X
// profile" with their picture. Mounted once in the root layout; driven by the
// notice accounts.activate raises. Reduce Motion fades instead of sliding.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Animated, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui";
import { clearSwitchNotice, subscribe, switchNotice, type SwitchNotice } from "@/lib/accounts";
import { useTheme } from "@/theme/tokens";

const SHOW_MS = 2500;

export function SwitchBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const notice = useSyncExternalStore(subscribe, switchNotice);
  const [shown, setShown] = useState<SwitchNotice | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  useEffect(() => {
    if (!notice) return;
    setShown(notice);
    progress.setValue(0);
    AccessibilityInfo.announceForAccessibility(notice.text);
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.8 }).start();
    const id = setTimeout(() => {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setShown(null);
        clearSwitchNotice();
      });
    }, SHOW_MS);
    return () => clearTimeout(id);
  }, [notice, progress]);

  if (!shown) return null;

  const translateY = reduce ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] });
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, alignItems: "center", opacity: progress, transform: [{ translateY }] }}
    >
      <Pressable
        onPress={() => clearSwitchNotice()}
        accessibilityRole="alert"
        style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: 999, backgroundColor: t.card }, t.shadow]}
      >
        <Avatar name={shown.name} uri={shown.avatarUrl} size={30} />
        <Text style={{ fontSize: 15, fontWeight: "600", color: t.text }}>{shown.text}</Text>
      </Pressable>
    </Animated.View>
  );
}
