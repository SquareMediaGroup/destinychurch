// What a person can change about how their own chats look: the colour of the
// messages they send and the picture behind a conversation. Pure data and
// maths (no React Native), so the unit tests can check every combination
// against WCAG contrast.
//
// Only the send colour and wallpaper are personal. They are stored on the
// phone (src/state/appearance.ts) and change nothing for anyone else: each
// person sees their own messages in their own colour and everyone else's in
// the neutral incoming colour.
//
// Every send colour is chosen so that the text on it passes AA (4.5:1) and
// the bubble stands out from the page at 3:1 or better, in light and dark.
// There is deliberately no free colour picker: a custom colour can't be
// guaranteed legible.

export const INK = "#0E1013";
const WHITE = "#FFFFFF";

// ── Contrast ────────────────────────────────────────────────────────────────

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two #RRGGBB colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * The page behind everything. Dark mode is a deep warm tint of the brand
 * orange, not pure black. tokens.ts builds its `bg` from these.
 */
export const PAGE_BG = { light: "#FFFFFF", dark: "#1A110A" } as const;

/** Body-text colours on the page, as tokens.ts sets them: `muted` is rgba, so it's given with its alpha. */
export const TEXT = {
  light: { text: INK, muted: { rgb: "#5B6570", alpha: 1 } },
  dark: { text: "#FFFFFF", muted: { rgb: "#FFFFFF", alpha: 0.82 } },
} as const;

/** The colour you actually see when `fg` at `alpha` sits on `bg`. */
export function blend(fg: string, alpha: number, bg: string): string {
  const f = parseInt(fg.slice(1), 16);
  const b = parseInt(bg.slice(1), 16);
  const mix = (shift: number) => Math.round(((f >> shift) & 255) * alpha + ((b >> shift) & 255) * (1 - alpha));
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0")}`;
}

// ── Send colours ────────────────────────────────────────────────────────────

export interface SendTone {
  /** Bubble and send-button fill. */
  bg: string;
  /** Text and icons on the fill. */
  fg: string;
}

export interface SendColour {
  id: string;
  label: string;
  light: SendTone;
  dark: SendTone;
}

export const SEND_COLOURS: readonly SendColour[] = [
  { id: "orange", label: "Orange", light: { bg: "#BF5200", fg: WHITE }, dark: { bg: "#F58021", fg: INK } },
  { id: "blue", label: "Blue", light: { bg: "#0B62D6", fg: WHITE }, dark: { bg: "#5AA2FF", fg: INK } },
  { id: "green", label: "Green", light: { bg: "#1B7A3D", fg: WHITE }, dark: { bg: "#4CD07A", fg: INK } },
  { id: "teal", label: "Teal", light: { bg: "#0B766F", fg: WHITE }, dark: { bg: "#3CCFC4", fg: INK } },
  { id: "purple", label: "Purple", light: { bg: "#7B3FD0", fg: WHITE }, dark: { bg: "#B58CFF", fg: INK } },
  { id: "pink", label: "Pink", light: { bg: "#C4245C", fg: WHITE }, dark: { bg: "#FF7AA8", fg: INK } },
  { id: "graphite", label: "Graphite", light: { bg: "#3A4048", fg: WHITE }, dark: { bg: "#D5D9DE", fg: INK } },
];

export const DEFAULT_SEND_COLOUR = "orange";

export function sendColour(id: string | null | undefined): SendColour {
  return SEND_COLOURS.find((c) => c.id === id) ?? SEND_COLOURS[0];
}

// ── Wallpapers ──────────────────────────────────────────────────────────────

export interface WallpaperTone {
  /** Gradient stops, top to bottom. Every stop is checked for contrast. */
  stops: readonly [string, string];
  /** The drawn shapes. Decorative, so kept quiet. */
  ink: string;
}

export type WallpaperPattern = "none" | "gradient" | "hills" | "dots" | "contours" | "sunburst" | "waves";

export interface Wallpaper {
  id: string;
  label: string;
  pattern: WallpaperPattern;
  light: WallpaperTone;
  dark: WallpaperTone;
}

export const WALLPAPERS: readonly Wallpaper[] = [
  { id: "none", label: "Plain", pattern: "none", light: { stops: [PAGE_BG.light, PAGE_BG.light], ink: PAGE_BG.light }, dark: { stops: [PAGE_BG.dark, PAGE_BG.dark], ink: PAGE_BG.dark } },
  { id: "dawn", label: "Dawn", pattern: "gradient", light: { stops: ["#FFF5EB", "#F9E8D8"], ink: "#F9E8D8" }, dark: { stops: ["#1A110A", "#2B180B"], ink: "#2B180B" } },
  { id: "hills", label: "Hills", pattern: "hills", light: { stops: ["#FCF6EE", "#F6E9D9"], ink: "#F1E2D0" }, dark: { stops: ["#1A110A", "#22170D"], ink: "#33230F" } },
  { id: "dots", label: "Dots", pattern: "dots", light: { stops: ["#FCF8F3", "#FCF8F3"], ink: "#EEE2D3" }, dark: { stops: ["#1A110A", "#1A110A"], ink: "#3A2818" } },
  { id: "contours", label: "Contours", pattern: "contours", light: { stops: ["#F6F8F4", "#EFF3EB"], ink: "#DEE6D7" }, dark: { stops: ["#0F1A14", "#12201A"], ink: "#22382C" } },
  { id: "sunburst", label: "Sunburst", pattern: "sunburst", light: { stops: ["#FFF8EF", "#FCEEDB"], ink: "#F8E1C4" }, dark: { stops: ["#1A110A", "#2A190C"], ink: "#3C2410" } },
  { id: "waves", label: "Waves", pattern: "waves", light: { stops: ["#F3F8FB", "#E9F1F6"], ink: "#D9E7F0" }, dark: { stops: ["#0D1620", "#101E2B"], ink: "#1B3145" } },
];

export const DEFAULT_WALLPAPER = "none";

export function wallpaper(id: string | null | undefined): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
}
