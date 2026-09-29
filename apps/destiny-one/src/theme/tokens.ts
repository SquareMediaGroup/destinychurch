// Destiny One colour tokens, light and dark — taken from the Claude Design
// prototype (DestinyOne.dc.html). Brand orange and greys match
// packages/shared/src/design/tokens.ts.

import { useMemo } from "react";
import { useColorScheme, type ImageSourcePropType } from "react-native";
import { colors } from "@destiny/shared";
import { useAppearance } from "@/state/appearance";
import { INK, PAGE_BG, sendColour, wallpaper, type Wallpaper, type WallpaperTone } from "@/theme/appearance";
import { photoSource } from "@/theme/photoWallpapers";

export const ORANGE = colors.orange; // #F58021
export const ORANGE_LIGHT = "#FAC397";
export { INK };

/** A photo behind the conversation. `dim` is the opacity of the page-coloured layer over it; `blur` is 0 to 1 of the maximum blur radius. */
export interface PhotoBackdrop {
  source: ImageSourcePropType;
  dim: number;
  blur: number;
}

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
  /** Selected photo wallpaper, or null. Never set together with `wall`. */
  photo: PhotoBackdrop | null;
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
  photo: null,
  shadow: { shadowColor: INK, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
};

// Dark mode uses a deep, warm tint of the brand orange instead of pure black,
// so it feels like Destiny rather than a generic dark theme.
const dark: Theme = {
  dark: true,
  bg: PAGE_BG.dark,
  grouped: PAGE_BG.dark,
  card: "#26190F",
  fill: "#312215",
  fill2: "#3D2C1E",
  sep: "rgba(255,214,170,0.14)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.82)",
  subtle: "rgba(255,255,255,0.72)",
  tint: ORANGE,
  accent: ORANGE,
  onAccent: INK,
  accentSoft: "rgba(245,128,33,0.2)",
  bubbleIn: "#33241A",
  glass: "rgba(49,34,21,0.66)",
  glassLine: "rgba(255,214,170,0.14)",
  avatar: "#4A3524",
  scrim: "rgba(10,5,0,0.6)",
  field: "#26190F",
  btn: "#3D2C1E",
  onBtn: "#FFFFFF",
  sheet: "#26190F",
  send: "#F58021",
  onSend: INK,
  onSendCard: "rgba(255,255,255,0.28)",
  wall: null,
  photo: null,
  shadow: { shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
};

/** The theme for the current light/dark setting, with this person's send colour and wallpaper applied. */
export function useTheme(): Theme {
  const isDark = useColorScheme() === "dark";
  const { sendColour: sendId, wallpaper: wallId, dim, blur, customFile } = useAppearance();
  const base = isDark ? dark : light;
  const tone = sendColour(sendId)[isDark ? "dark" : "light"];
  return useMemo(() => {
    const wall = wallpaper(wallId);
    const source = photoSource(wallId, customFile);
    return {
      ...base,
      // Over a light wallpaper an incoming bubble is white, so it stays visible.
      bubbleIn: (wall.pattern !== "none" || source) && !isDark ? "#FFFFFF" : base.bubbleIn,
      send: tone.bg,
      onSend: tone.fg,
      onSendCard: tone.fg === INK ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)",
      wall: source || wall.pattern === "none" ? null : { def: wall, tone: isDark ? wall.dark : wall.light },
      photo: source ? { source, dim, blur } : null,
    };
  }, [base, tone, wallId, dim, blur, customFile, isDark]);
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
