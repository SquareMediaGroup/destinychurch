// The one surface primitive for Destiny One's chrome (tab bar, headers,
// composer, sheets). On iOS 26+ it is Apple's Liquid Glass via
// expo-glass-effect; on Android and older iOS it falls back to a translucent
// solid surface so layouts look intentional everywhere rather than broken.
//
// Don't animate a GlassSurface (or a parent) to opacity 0 — the glass stops
// rendering entirely. Use glassEffectStyle's own animation instead.

import type { ReactNode } from "react";
import { Platform, StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

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

  if (liquidGlass) {
    return (
      <GlassView glassEffectStyle={variant} isInteractive={interactive} tintColor={tintColor} style={style}>
        {children}
      </GlassView>
    );
  }

  return <View style={[styles.fallback, dark ? styles.dark : styles.light, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: { overflow: "hidden" },
  light: { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "rgba(0,0,0,0.08)", borderWidth: StyleSheet.hairlineWidth },
  dark: { backgroundColor: "rgba(28,28,30,0.92)", borderColor: "rgba(255,255,255,0.12)", borderWidth: StyleSheet.hairlineWidth },
});
