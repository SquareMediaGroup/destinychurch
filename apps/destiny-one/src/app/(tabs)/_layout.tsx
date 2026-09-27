// Chats / Search / Settings, with the design's floating glass tab bar.
//
// Switching tabs: the highlight slides to the new tab on a spring, the new
// tab's icon gives a small bounce, and the screens cross-fade ("fade"
// scene animation). Reduce Motion turns the slide and bounce off.
//
// Holding the Settings tab opens the account switcher.

import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon, type IconName } from "@/components/Icon";
import { withAlpha } from "@/components/ui";
import { useTheme } from "@/theme/tokens";

const TABS: Record<string, { label: string; icon: IconName }> = {
  chats: { label: "Chats", icon: "chats" },
  find: { label: "Search", icon: "search" },
  settings: { label: "Settings", icon: "sliders" },
};

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

function TabButton({ label, icon, focused, reduce, onPress, onLongPress, hint }: { label: string; icon: IconName; focused: boolean; reduce: boolean; onPress: () => void; onLongPress?: () => void; hint?: string }) {
  const t = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const color = focused ? t.tint : t.text;

  useEffect(() => {
    if (!focused || reduce) return;
    scale.setValue(0.82);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
  }, [focused, reduce, scale]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flex: 1, height: 54, alignItems: "center", justifyContent: "center", gap: 2 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={icon} size={24} color={color} strokeWidth={1.9} />
      </Animated.View>
      <Text style={{ fontSize: 10, fontWeight: "600", color }}>{label}</Text>
    </Pressable>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const bottom = Math.max(insets.bottom - 6, 12);
  const routes = state.routes.filter((r) => TABS[r.name]);
  const activeKey = state.routes[state.index]?.key;
  const index = Math.max(0, routes.findIndex((r) => r.key === activeKey));

  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = rowWidth > 0 ? rowWidth / routes.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (!tabWidth) return;
    const to = index * tabWidth;
    if (!placed.current || reduce) {
      x.setValue(to);
      placed.current = true;
    } else {
      Animated.spring(x, { toValue: to, friction: 9, tension: 90, useNativeDriver: true }).start();
    }
  }, [index, tabWidth, reduce, x]);

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <LinearGradient pointerEvents="none" colors={[withAlpha(t.bg, 0), withAlpha(t.bg, 0.9)]} locations={[0, 0.7]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }} />
      <GlassSurface style={[{ marginHorizontal: 24, marginBottom: bottom, height: 62, borderRadius: 31, padding: 4 }, t.shadow]}>
        <View style={{ flex: 1, flexDirection: "row" }} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{ position: "absolute", top: 0, left: 0, width: tabWidth, height: 54, borderRadius: 27, backgroundColor: t.fill, transform: [{ translateX: x }] }}
            />
          ) : null}
          {routes.map((route) => {
            const tab = TABS[route.name];
            const focused = route.key === activeKey;
            return (
              <TabButton
                key={route.key}
                label={tab.label}
                icon={tab.icon}
                focused={focused}
                reduce={reduce}
                onLongPress={route.name === "settings" ? () => router.push("/accounts") : undefined}
                hint={route.name === "settings" ? "Hold to switch account" : undefined}
                onPress={() => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
              />
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, animation: "fade" }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="find" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
