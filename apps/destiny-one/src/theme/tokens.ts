// Destiny One colour tokens, light and dark — taken from the Claude Design
// prototype (DestinyOne.dc.html). Brand orange and greys match
// packages/shared/src/design/tokens.ts.

import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { colors } from "@destiny/shared";
import { useAppearance } from "@/state/appearance";
import { INK, PAGE_BG, sendColour, wallpaper, type Wallpaper, type WallpaperTone } from "@/theme/appearance";

export const ORANGE = colors.orange; // #F58021
export const ORANGE_LIGHT = "#FAC397";
export { INK };

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
  /** The person's own send colour: bubbles they send and the send button. */
  send: string;
  /** Text and icons on `send`. Always at least 4.5:1. */
  onSend: string;
  /** A quiet panel inside a sent bubble (reply preview, file, event, poll). */
  onSendCard: string;
  /** Selected wallpaper, or null for plain. */
  wall: { def: Wallpaper; tone: WallpaperTone } | null;
  shadow: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
}

const light: Theme = {
  dark: false,
  bg: PAGE_BG.light,
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
  send: "#BF5200",
  onSend: "#FFFFFF",
  onSendCard: "rgba(0,0,0,0.18)",
  wall: null,
  shadow: { shadowColor: INK, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
};

// Dark mode is near-black and neutral, not pure #000 (which is harsh against
// bright text and smears on OLED scroll) and not tinted. Surfaces step up in
// small, even lightness steps so cards, fields and bubbles stay distinguishable.
const dark: Theme = {
  dark: true,
  bg: PAGE_BG.dark,
  grouped: PAGE_BG.dark,
  card: "#151517",
  fill: "#1C1C1F",
  fill2: "#28282C",
  sep: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.82)",
  subtle: "rgba(255,255,255,0.72)",
  tint: ORANGE,
  accent: ORANGE,
  onAccent: INK,
  accentSoft: "rgba(245,128,33,0.2)",
  bubbleIn: "#212125",
  glass: "rgba(28,28,31,0.66)",
  glassLine: "rgba(255,255,255,0.12)",
  avatar: "#3A3A40",
  scrim: "rgba(0,0,0,0.6)",
  field: "#151517",
  btn: "#28282C",
  onBtn: "#FFFFFF",
  sheet: "#151517",
  send: "#F58021",
  onSend: INK,
  onSendCard: "rgba(255,255,255,0.28)",
  wall: null,
  shadow: { shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
};

/** The theme for the current light/dark setting, with this person's send colour and wallpaper applied. */
export function useTheme(): Theme {
  const isDark = useColorScheme() === "dark";
  const { sendColour: sendId, wallpaper: wallId } = useAppearance();
  const base = isDark ? dark : light;
  const tone = sendColour(sendId)[isDark ? "dark" : "light"];
  return useMemo(() => {
    const wall = wallpaper(wallId);
    return {
      ...base,
      // Over a light wallpaper an incoming bubble is white, so it stays visible.
      bubbleIn: wall.pattern !== "none" && !isDark ? "#FFFFFF" : base.bubbleIn,
      send: tone.bg,
      onSend: tone.fg,
      onSendCard: tone.fg === INK ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)",
      wall: wall.pattern === "none" ? null : { def: wall, tone: isDark ? wall.dark : wall.light },
    };
  }, [base, tone, wallId, isDark]);
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
