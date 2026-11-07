// Pieces shared by the Appearance screen and the first-run Setup: the theme
// picker (four little phones drawn in code, so they're sharp on every screen),
// the ring that springs around a selected choice, and its tick.

import { useEffect, useState } from "react";
import { Animated, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { Appear, PressableScale, reduceMotion, springs } from "@/components/Motion";
import { haptic } from "@/lib/haptics";
import { appearance, useAppearance, type ThemeMode } from "@/state/appearance";
import { PAGE_BG, sendColour, type LookKey } from "@/theme/appearance";
import { useTheme } from "@/theme/tokens";

export const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "black", label: "True dark" },
];

/** How far the ring sits outside the thing it surrounds. Give the parent this much room. */
export const RING_GAP = 4;

/**
 * The selection outline: it springs in (a touch larger, settling onto the
 * choice) when selected and fades away when not. Sits outside its parent's
 * edges, so the parent must not clip.
 */
export function SelectRing({ on, radius, color }: { on: boolean; radius: number; color?: string }) {
  const t = useTheme();
  const [p] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (reduceMotion()) {
      Animated.timing(p, { toValue: on ? 1 : 0, duration: 120, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(p, { toValue: on ? 1 : 0, ...(on ? springs.pop : springs.press), useNativeDriver: true }).start();
  }, [on, p]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -RING_GAP,
        left: -RING_GAP,
        right: -RING_GAP,
        bottom: -RING_GAP,
        borderRadius: radius + RING_GAP,
        borderWidth: 2.5,
        borderColor: color ?? t.tint,
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }],
      }}
    />
  );
}

/** The round tick in the corner of a selected tile. Pops in each time it appears. */
export function Tick({ size = 22 }: { size?: number }) {
  const t = useTheme();
  return (
    <Appear from={{ scale: 0.2 }} style={{ position: "absolute", right: 6, bottom: 6 }}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.tint, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: t.bg }]}>
        <Icon name="check" size={Math.round(size * 0.55)} color={t.dark ? "#0E1013" : "#FFFFFF"} strokeWidth={3.4} />
      </View>
    </Appear>
  );
}

const INCOMING = { light: "#E9E9EB", dark: "#3A2A1E", black: "#2A2A2E" } as const;
const CHROME = { light: "rgba(14,16,19,0.07)", dark: "rgba(255,255,255,0.1)", black: "rgba(255,255,255,0.09)" } as const;

/** A tiny conversation in one look: header, two messages each way, the message box. */
export function ScreenSketch({ look }: { look: LookKey }) {
  const send = sendColour(useAppearance().sendColour)[look].bg;
  const line = (width: `${number}%`, mine: boolean) => (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", width, height: 9, borderRadius: 4.5, backgroundColor: mine ? send : INCOMING[look] }} />
  );
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG[look], paddingHorizontal: 9, paddingTop: 10, paddingBottom: 9, justifyContent: "space-between" }}>
      <View style={{ alignSelf: "center", width: "46%", height: 8, borderRadius: 4, backgroundColor: CHROME[look] }} />
      <View style={{ gap: 5 }}>
        {line("68%", false)}
        {line("46%", false)}
        {line("56%", true)}
        {line("38%", true)}
      </View>
      <View style={{ height: 9, borderRadius: 4.5, backgroundColor: CHROME[look] }} />
    </View>
  );
}

/** System is drawn half light, half dark: the same sketch twice, each clipped to one side. */
function ModeArt({ mode }: { mode: ThemeMode }) {
  if (mode !== "system") return <ScreenSketch look={mode} />;
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <View style={{ flex: 1, overflow: "hidden" }}>
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "200%" }}>
          <ScreenSketch look="light" />
        </View>
      </View>
      <View style={{ flex: 1, overflow: "hidden" }}>
        <View style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "200%" }}>
          <ScreenSketch look="dark" />
        </View>
      </View>
    </View>
  );
}

/** System, Light, Dark, True dark: four little phones. The theme changes live as you pick. */
export function ThemeModePicker({ height = 124 }: { height?: number }) {
  const t = useTheme();
  const { mode } = useAppearance();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12, paddingHorizontal: RING_GAP, paddingTop: RING_GAP }}>
      {MODE_OPTIONS.map((o) => {
        const on = o.key === mode;
        return (
          <PressableScale
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.key === "system" ? "System, matches your phone" : o.label}
            scaleTo={0.94}
            wrapStyle={{ flex: 1 }}
            onPress={() => {
              if (on) return;
              haptic.selection();
              appearance.set({ mode: o.key });
            }}
            style={{ gap: 8, alignItems: "center" }}
          >
            <View style={{ width: "100%", height }}>
              <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: t.sep }}>
                <ModeArt mode={o.key} />
              </View>
              <SelectRing on={on} radius={16} />
              {on ? <Tick /> : null}
            </View>
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 13, fontWeight: on ? "600" : "400", color: on ? t.text : t.muted }}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
