// The one surface primitive for Destiny One's chrome (tab bar, headers,
// composer, sheets). On iOS 26+ it is Apple's Liquid Glass via
// expo-glass-effect; on Android and older iOS it falls back to a translucent
// solid surface so layouts look intentional everywhere rather than broken.
//
// Don't animate a GlassSurface (or a parent) to opacity 0 — the glass stops
// rendering entirely. Use glassEffectStyle's own animation instead.
//
// Real glass brings its own depth and touch response, so on iOS 26 any drop
// shadow in `style` is ignored (a second, painted shadow muddies the lensing),
// and interactive glass ignores a pressed-state `opacity` (it already lights
// up and flexes under the finger, as Apple's controls do). Both still apply to
// the fallback surface, which has neither.

import type { ReactNode } from "react";
import { useAppearance } from "@/state/appearance";
import { Platform, StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

export const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

export interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** "clear" for over busy content (images), "regular" everywhere else. */
  variant?: "regular" | "clear";
  /** Makes the glass respond to touch (buttons, the composer). */
  interactive?: boolean;
  tintColor?: string;
}

export function GlassSurface({ children, style, variant = "regular", interactive = false, tintColor }: GlassSurfaceProps) {
  const dark = useColorScheme() === "dark";
  const black = useAppearance().mode === "black";

  if (liquidGlass) {
    return (
      <GlassView glassEffectStyle={variant} isInteractive={interactive} tintColor={tintColor} style={glassStyle(style, interactive)}>
        {children}
      </GlassView>
    );
  }

  return <View style={[styles.fallback, dark ? (black ? styles.black : styles.dark) : styles.light, style]}>{children}</View>;
}

// RN's own typing of flatten() rejects a plain ViewStyle prop; at runtime it takes one happily.
const flatten = StyleSheet.flatten as (style: StyleProp<ViewStyle>) => ViewStyle | undefined;

function glassStyle(style: StyleProp<ViewStyle>, interactive: boolean): ViewStyle {
  const { shadowColor: _c, shadowOpacity: _o, shadowRadius: _r, shadowOffset: _f, elevation: _e, opacity, ...rest } = flatten(style) ?? {};
  return interactive ? rest : { ...rest, opacity };
}

const styles = StyleSheet.create({
  fallback: { overflow: "hidden" },
  light: { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "rgba(0,0,0,0.08)", borderWidth: StyleSheet.hairlineWidth },
  dark: { backgroundColor: "rgba(38,25,15,0.92)", borderColor: "rgba(255,214,170,0.14)", borderWidth: StyleSheet.hairlineWidth },
  black: { backgroundColor: "rgba(21,21,23,0.92)", borderColor: "rgba(255,255,255,0.12)", borderWidth: StyleSheet.hairlineWidth },
});
