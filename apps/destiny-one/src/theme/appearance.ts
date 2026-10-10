// What a person can change about how their own chats look: the colour of the
// messages they send and the picture behind a conversation. Pure data and
// maths (no React Native), so the unit tests can check every combination
// against WCAG contrast.
//
// Only the send colour and wallpaper are personal. They are stored on the
// phone (src/state/appearance.ts) and change nothing for anyone else: each
// person sees their own messages in their own colour and everyone else's in
// the neutral incoming colour. A wallpaper can also be a photo, one of the
// stock ones shipped in the app or the person's own. Neither ever leaves the
// phone, and nothing about a photo wallpaper is sent to the server.
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
 * The page behind everything. `dark` is a deep warm tint of the brand orange;
 * `black` ("True dark") is near-black and neutral (not pure #000, which is harsh
 * on the eyes). tokens.ts builds its `bg` from these.
 */
export const PAGE_BG = { light: "#FFFFFF", dark: "#1A110A", black: "#0B0B0C" } as const;

/** The three looks. `black` shares `dark`'s native scheme (keyboard, alerts) and send colours. */
export type LookKey = keyof typeof PAGE_BG;

/** Body-text colours on the page, as tokens.ts sets them: `muted` is rgba, so it's given with its alpha. */
export const TEXT = {
  light: { text: INK, muted: { rgb: "#5B6570", alpha: 1 } },
  dark: { text: "#FFFFFF", muted: { rgb: "#FFFFFF", alpha: 0.82 } },
  black: { text: "#FFFFFF", muted: { rgb: "#FFFFFF", alpha: 0.82 } },
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
  /** True dark uses the dark tones, which are already made for a near-black page. */
  black: SendTone;
}

const SEND_BASE = [
  // Dark-mode orange is deep enough for white text (4.6:1); the bright brand orange only takes ink.
  { id: "orange", label: "Orange", light: { bg: "#BF5200", fg: WHITE }, dark: { bg: "#C25400", fg: WHITE } },
  { id: "blue", label: "Blue", light: { bg: "#0B62D6", fg: WHITE }, dark: { bg: "#5AA2FF", fg: INK } },
  { id: "green", label: "Green", light: { bg: "#1B7A3D", fg: WHITE }, dark: { bg: "#4CD07A", fg: INK } },
  { id: "teal", label: "Teal", light: { bg: "#0B766F", fg: WHITE }, dark: { bg: "#3CCFC4", fg: INK } },
  { id: "purple", label: "Purple", light: { bg: "#7B3FD0", fg: WHITE }, dark: { bg: "#B58CFF", fg: INK } },
  { id: "pink", label: "Pink", light: { bg: "#C4245C", fg: WHITE }, dark: { bg: "#FF7AA8", fg: INK } },
  { id: "graphite", label: "Graphite", light: { bg: "#3A4048", fg: WHITE }, dark: { bg: "#D5D9DE", fg: INK } },
] as const;

export const SEND_COLOURS: readonly SendColour[] = SEND_BASE.map((c) => ({ ...c, black: c.dark }));

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
  /** Same picture in neutral near-black, for True dark. */
  black: WallpaperTone;
}

export const WALLPAPERS: readonly Wallpaper[] = [
  { id: "none", label: "Plain", pattern: "none", light: { stops: [PAGE_BG.light, PAGE_BG.light], ink: PAGE_BG.light }, dark: { stops: [PAGE_BG.dark, PAGE_BG.dark], ink: PAGE_BG.dark }, black: { stops: [PAGE_BG.black, PAGE_BG.black], ink: PAGE_BG.black } },
  { id: "dawn", label: "Dawn", pattern: "gradient", light: { stops: ["#FFF5EB", "#F9E8D8"], ink: "#F9E8D8" }, dark: { stops: ["#1A110A", "#2B180B"], ink: "#2B180B" }, black: { stops: ["#0B0B0C", "#1A120B"], ink: "#1A120B" } },
  { id: "hills", label: "Hills", pattern: "hills", light: { stops: ["#FCF6EE", "#F6E9D9"], ink: "#F1E2D0" }, dark: { stops: ["#1A110A", "#22170D"], ink: "#33230F" }, black: { stops: ["#0B0B0C", "#120E0A"], ink: "#221A11" } },
  { id: "dots", label: "Dots", pattern: "dots", light: { stops: ["#FCF8F3", "#FCF8F3"], ink: "#EEE2D3" }, dark: { stops: ["#1A110A", "#1A110A"], ink: "#3A2818" }, black: { stops: ["#0B0B0C", "#0B0B0C"], ink: "#27221D" } },
  { id: "contours", label: "Contours", pattern: "contours", light: { stops: ["#F6F8F4", "#EFF3EB"], ink: "#DEE6D7" }, dark: { stops: ["#0F1A14", "#12201A"], ink: "#1C2E25" }, black: { stops: ["#080D0A", "#0B120E"], ink: "#1A2A20" } },
  { id: "sunburst", label: "Sunburst", pattern: "sunburst", light: { stops: ["#FFF8EF", "#FCEEDB"], ink: "#F8E1C4" }, dark: { stops: ["#1A110A", "#2A190C"], ink: "#3C2410" }, black: { stops: ["#0B0B0C", "#1A1109"], ink: "#2C1C0E" } },
  { id: "waves", label: "Waves", pattern: "waves", light: { stops: ["#F3F8FB", "#E9F1F6"], ink: "#D9E7F0" }, dark: { stops: ["#0D1620", "#101E2B"], ink: "#182C3E" }, black: { stops: ["#080B10", "#0B121A"], ink: "#15263A" } },
];

export const DEFAULT_WALLPAPER = "none";

export function wallpaper(id: string | null | undefined): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
}

// ── Photo wallpapers ────────────────────────────────────────────────────────
//
// A photo can't be checked for contrast the way a gradient can, so a photo
// wallpaper is made safe differently: the person can dim (or, in light mode,
// fade) and blur it, and everything that would otherwise sit bare on the photo
// (times, names, day dividers) gets a near-opaque chip. The tests check that
// chip against the harshest possible photo pixel, pure black and pure white.

export interface PhotoWallpaper {
  /** Stored value, `photo:<key>`. The key names the files in assets/wallpapers. */
  id: string;
  key: string;
  label: string;
}

const photo = (key: string, label: string): PhotoWallpaper => ({ id: `photo:${key}`, key, label });

/** Stock photos bundled with the app (Unsplash licence: free to use, no credit required). */
export const PHOTO_WALLPAPERS: readonly PhotoWallpaper[] = [
  photo("woodland", "Woodland"),
  photo("alpine", "Alpine"),
  photo("valley", "Valley"),
  photo("meadow", "Meadow"),
  photo("dusk", "Dusk"),
  photo("sunrise", "Sunrise"),
  photo("lake", "Lake"),
  photo("clouds", "Clouds"),
  photo("shoreline", "Shoreline"),
  photo("stars", "Night sky"),
];

/** The person's own photo, kept in the app's private storage on this phone. */
export const CUSTOM_WALLPAPER = "custom";

export function photoWallpaper(id: string | null | undefined): PhotoWallpaper | undefined {
  return PHOTO_WALLPAPERS.find((p) => p.id === id);
}

/** True for a stock photo or the person's own. */
export function isPhotoWallpaper(id: string | null | undefined): boolean {
  return id === CUSTOM_WALLPAPER || photoWallpaper(id) !== undefined;
}

/** How far a photo is dimmed to start with, and the most it can be (so it never disappears entirely). */
export const DEFAULT_DIM = 0.4;
export const MAX_DIM = 0.9;
export const DEFAULT_BLUR = 0;
/** Image blur radius at the top of the slider. */
export const MAX_BLUR_RADIUS = 24;

/** The five steps (Low to High) the Dim/Fade and Blur settings snap to. */
export const DIM_PRESETS = [0.1, 0.25, 0.4, 0.6, 0.8] as const;
export const BLUR_PRESETS = [0, 0.25, 0.5, 0.75, 1] as const;

/** Index of the preset closest to `value` (older saved values sit between steps). */
export function nearestPreset(presets: readonly number[], value: number): number {
  let best = 0;
  for (let i = 1; i < presets.length; i++) {
    if (Math.abs(presets[i] - value) < Math.abs(presets[best] - value)) best = i;
  }
  return best;
}

/** Both settings are stored as 0 to 1; anything else (a corrupt file) becomes `fallback`. */
export function unit(value: unknown, fallback: number, max = 1): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
}

/** Opacity of the chip behind text that sits directly on a photo (page colour at this alpha). */
export const PHOTO_CHIP_ALPHA = 0.9;
