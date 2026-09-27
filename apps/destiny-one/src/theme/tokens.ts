// Destiny One colour tokens, light and dark — taken from the Claude Design
// prototype (DestinyOne.dc.html). Brand orange and greys match
// packages/shared/src/design/tokens.ts.

import { useColorScheme } from "react-native";
import { colors } from "@destiny/shared";

export const ORANGE = colors.orange; // #F58021
export const ORANGE_LIGHT = "#FAC397";
export const INK = "#0E1013";

export interface Theme {
  dark: boolean;
  bg: string;
  grouped: string;
  card: string;
  fill: string;
  fill2: string;
  sep: string;
  text: string;
  muted: string;
  subtle: string;
  /** Link / tint colour. Darker orange in light mode so text passes AA on white. */
  tint: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  bubbleIn: string;
  glass: string;
  glassLine: string;
  avatar: string;
  scrim: string;
  field: string;
  btn: string;
  onBtn: string;
  sheet: string;
  shadow: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
}

const light: Theme = {
  dark: false,
  bg: "#FFFFFF",
  grouped: "#F3F3F4",
  card: "#FFFFFF",
  fill: "#F3F3F4",
  fill2: "#E1E2E4",
  sep: "rgba(54,63,72,0.16)",
  text: INK,
  muted: "#5B6570",
  subtle: "#6B7580",
  tint: "#C9691B",
  accent: ORANGE,
  onAccent: INK,
  accentSoft: "#FEECDE",
  bubbleIn: "#F3F3F4",
  glass: "rgba(255,255,255,0.72)",
  glassLine: "rgba(54,63,72,0.12)",
  avatar: "#363F48",
  scrim: "rgba(14,16,19,0.28)",
  field: "#F3F3F4",
  btn: INK,
  onBtn: "#FFFFFF",
  sheet: "#FFFFFF",
  shadow: { shadowColor: INK, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
};

const dark: Theme = {
  dark: true,
  bg: "#000000",
  grouped: "#000000",
  card: "#181C20",
  fill: "#23282E",
  fill2: "#2C343B",
  sep: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.82)",
  subtle: "rgba(255,255,255,0.72)",
  tint: ORANGE,
  accent: ORANGE,
  onAccent: INK,
  accentSoft: "rgba(245,128,33,0.2)",
  bubbleIn: "#23282E",
  glass: "rgba(35,40,46,0.66)",
  glassLine: "rgba(255,255,255,0.12)",
  avatar: "#363F48",
  scrim: "rgba(0,0,0,0.55)",
  field: "#181C20",
  btn: "#2C343B",
  onBtn: "#FFFFFF",
  sheet: "#181C20",
  shadow: { shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

/** iOS large-title and body sizes used throughout the design. */
export const type = {
  largeTitle: { fontSize: 34, fontWeight: "700", letterSpacing: 0.3 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: 0.2 },
  body: { fontSize: 17, lineHeight: 23 },
  callout: { fontSize: 15, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12 },
} as const;
