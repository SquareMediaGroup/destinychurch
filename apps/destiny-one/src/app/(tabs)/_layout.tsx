// Chats / Groups / Settings, with the design's floating glass tab bar.

import { Pressable, Text, View } from "react-native";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon, type IconName } from "@/components/Icon";
import { withAlpha } from "@/components/ui";
import { useTheme } from "@/theme/tokens";

const TABS: Record<string, { label: string; icon: IconName }> = {
  chats: { label: "Chats", icon: "chats" },
  groups: { label: "Groups", icon: "people" },
  settings: { label: "Settings", icon: "sliders" },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom - 6, 12);
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <LinearGradient pointerEvents="none" colors={[withAlpha(t.bg, 0), withAlpha(t.bg, 0.9)]} locations={[0, 0.7]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }} />
      <GlassSurface style={[{ marginHorizontal: 24, marginBottom: bottom, height: 62, borderRadius: 31, flexDirection: "row", padding: 4 }, t.shadow]}>
        {state.routes.map((route, i) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === i;
          const color = focused ? t.tint : t.text;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, height: 54, borderRadius: 27, backgroundColor: focused ? t.fill : "transparent", alignItems: "center", justifyContent: "center", gap: 2 }}
            >
              <Icon name={tab.icon} size={24} color={color} strokeWidth={1.9} />
              <Text style={{ fontSize: 10, fontWeight: "600", color }}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
