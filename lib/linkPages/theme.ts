// Themes for the links pages.
//
// A theme is plain JSON in link_pages.theme, parsed by ThemeSchema. Every field
// has a default, and the defaults ARE the Destiny Light preset — so '{}' (what
// the migration seeds) is a finished theme, and a theme saved before a new
// option existed still parses into something sensible.
//
// Themes never carry raw CSS. Colours and gradients are regex-checked, fonts
// are keys into an allowlist, and everything reaches the page as CSS custom
// properties on the wrapper (themeToCssVars), where the stylesheet in
// components/links/links.css decides what each one does. That keeps a theme
// from being a way to inject arbitrary styles — or url() trackers — into a
// public page.
//
// Client-safe: the editor imports this for the preset cards and live preview.

import { z } from "zod";

/* ── Primitives ───────────────────────────────────────────────────────────── */

const COLOR_RE =
  /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%a-z]+\)|transparent)$/i;

/** What react-best-gradient-color-picker emits: linear/radial gradients of rgba stops. */
const GRADIENT_RE = /^(repeating-)?(linear|radial|conic)-gradient\([#a-z0-9\s.,%()-]+\)$/i;

export function isThemeColor(value: unknown): value is string {
  return typeof value === "string" && COLOR_RE.test(value.trim());
}

export function isThemeGradient(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 600 &&
    GRADIENT_RE.test(value.trim()) &&
    !/url\s*\(/i.test(value)
  );
}

const color = (fallback: string) =>
  z.string().trim().refine(isThemeColor, "Not a colour").catch(fallback).default(fallback);

const gradient = (fallback: string) =>
  z.string().trim().refine(isThemeGradient, "Not a gradient").catch(fallback).default(fallback);

/** https or a site path — never data:, javascript: or a CSS url() payload. */
const mediaUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^(https:\/\/|\/(?!\/))[^\s"'()\\]*$/i.test(v), "Not a valid image URL")
  .catch("")
  .default("");

/* ── Fonts ────────────────────────────────────────────────────────────────── */

/**
 * The fonts a theme may use. The first four are already loaded site-wide in
 * app/layout.tsx; the rest are loaded by components/links/fonts.ts, only on
 * pages that render a links page. Anton is deliberately absent — it is the
 * homepage's display face and nowhere else.
 */
export const FONT_OPTIONS = {
  classic: { label: "Classic sans", css: 'var(--font-heading), Arial, sans-serif' },
  roboto: { label: "Roboto", css: "var(--font-roboto), system-ui, sans-serif" },
  playfair: { label: "Playfair Display", css: "var(--font-playfair), Georgia, serif" },
  poppins: { label: "Poppins", css: "var(--font-poppins), system-ui, sans-serif" },
  inter: { label: "Inter", css: "var(--font-lp-inter), system-ui, sans-serif" },
  "space-grotesk": { label: "Space Grotesk", css: "var(--font-lp-space-grotesk), system-ui, sans-serif" },
  "dm-serif": { label: "DM Serif Display", css: "var(--font-lp-dm-serif), Georgia, serif" },
  caveat: { label: "Caveat (handwritten)", css: "var(--font-lp-caveat), cursive" },
} as const;

export type FontKey = keyof typeof FONT_OPTIONS;
const FONT_KEYS = Object.keys(FONT_OPTIONS) as [FontKey, ...FontKey[]];

/* ── Schema ───────────────────────────────────────────────────────────────── */

export const BUTTON_STYLES = ["fill", "outline", "soft", "hard", "glass"] as const;
export const BUTTON_RADII = ["square", "rounded", "pill"] as const;
export const HOVER_EFFECTS = ["fill", "lift", "grow", "none"] as const;
export const AVATAR_SHAPES = ["circle", "rounded", "square", "hidden"] as const;
export const BACKGROUND_TYPES = ["solid", "gradient", "image", "video"] as const;

export const ThemeSchema = z.object({
  /** Which preset this started from — a label for the editor, nothing more. */
  preset: z.string().max(40).catch("custom").default("destiny-light"),
  background: z
    .object({
      type: z.enum(BACKGROUND_TYPES).catch("solid").default("solid"),
      color: color("#ffffff"),
      gradient: gradient("linear-gradient(160deg, #f58021 0%, #d9366b 55%, #8106b1 100%)"),
      imageUrl: mediaUrl,
      videoUrl: mediaUrl,
      /** Darkening layer over an image or video, 0–90 (%). */
      overlay: z.number().min(0).max(90).catch(0).default(0),
      /** Blur on an image or video background, 0–20 (px). */
      blur: z.number().min(0).max(20).catch(0).default(0),
      /** The soft orange/blue glow the Destiny pages carry in their corners. */
      glow: z.boolean().catch(true).default(true),
    })
    .default({}),
  text: z
    .object({
      color: color("#2d2d2d"),
      heading: color("#2d2d2d"),
    })
    .default({}),
  accent: color("#f58021"),
  button: z
    .object({
      style: z.enum(BUTTON_STYLES).catch("fill").default("fill"),
      radius: z.enum(BUTTON_RADII).catch("rounded").default("rounded"),
      bg: color("#ffffff"),
      text: color("#2d2d2d"),
      shadow: color("#2d2d2d"),
      align: z.enum(["left", "center"]).catch("left").default("left"),
      hover: z.enum(HOVER_EFFECTS).catch("fill").default("fill"),
    })
    .default({}),
  font: z
    .object({
      heading: z.enum(FONT_KEYS).catch("playfair").default("playfair"),
      body: z.enum(FONT_KEYS).catch("roboto").default("roboto"),
    })
    .default({}),
  avatar: z
    .object({
      shape: z.enum(AVATAR_SHAPES).catch("circle").default("circle"),
    })
    .default({}),
  layout: z
    .object({
      /** `hero` puts a full-width cover image above the profile. */
      style: z.enum(["classic", "hero"]).catch("classic").default("classic"),
      coverUrl: mediaUrl,
      /** `grid` sets plain link buttons two-up from tablet width, like the old /links. */
      links: z.enum(["list", "grid"]).catch("grid").default("grid"),
    })
    .default({}),
  effects: z
    .object({
      /** Staggered rise-in on load. Always off under prefers-reduced-motion. */
      entrance: z.boolean().catch(true).default(true),
    })
    .default({}),
});

export type Theme = z.infer<typeof ThemeSchema>;
/** What the editor holds while a theme is being edited — same shape, all present. */
export type ThemeInput = z.input<typeof ThemeSchema>;

export function parseTheme(value: unknown): Theme {
  const parsed = ThemeSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : ThemeSchema.parse({});
}

/* ── Presets ──────────────────────────────────────────────────────────────── */

export interface ThemePreset {
  key: string;
  label: string;
  description: string;
  theme: Theme;
}

function preset(key: string, label: string, description: string, overrides: ThemeInput): ThemePreset {
  return { key, label, description, theme: ThemeSchema.parse({ ...overrides, preset: key }) };
}

export const THEME_PRESETS: ThemePreset[] = [
  preset("destiny-light", "Destiny Light", "White with the orange glow — the classic Next Steps look.", {}),
  preset("destiny-dark", "Destiny Dark", "Charcoal, white type, orange on hover.", {
    background: { type: "solid", color: "#1c1c1c", glow: true },
    text: { color: "#f3f3f3", heading: "#ffffff" },
    button: { style: "fill", bg: "#2b2b2b", text: "#ffffff", shadow: "#000000", hover: "fill" },
  }),
  preset("sunrise", "Sunrise", "Orange-to-purple gradient with frosted buttons.", {
    background: {
      type: "gradient",
      gradient: "linear-gradient(160deg, #f58021 0%, #d9366b 55%, #8106b1 100%)",
      glow: false,
    },
    text: { color: "#ffffff", heading: "#ffffff" },
    accent: "#ffffff",
    button: { style: "glass", radius: "pill", bg: "#ffffff", text: "#ffffff", align: "center", hover: "grow" },
    font: { heading: "poppins", body: "inter" },
    layout: { links: "list" },
  }),
  preset("ocean", "Ocean", "Deep Destiny blue, solid white pills.", {
    background: {
      type: "gradient",
      gradient: "linear-gradient(180deg, #0857ba 0%, #062e63 100%)",
      glow: false,
    },
    text: { color: "#e8f0fb", heading: "#ffffff" },
    accent: "#f58021",
    button: { style: "fill", radius: "pill", bg: "#ffffff", text: "#0857ba", align: "center", hover: "lift" },
    font: { heading: "space-grotesk", body: "inter" },
    layout: { links: "list" },
  }),
  preset("minimal", "Minimal", "Paper white, black outlines, square corners.", {
    background: { type: "solid", color: "#f4f4f0", glow: false },
    text: { color: "#111111", heading: "#111111" },
    accent: "#111111",
    button: { style: "outline", radius: "square", bg: "#111111", text: "#111111", align: "center", hover: "fill" },
    font: { heading: "inter", body: "inter" },
    avatar: { shape: "square" },
    layout: { links: "list" },
  }),
  preset("bold-pop", "Bold Pop", "Cream, hard shadows, handwritten headings.", {
    background: { type: "solid", color: "#fff4d6", glow: false },
    text: { color: "#1a1a1a", heading: "#1a1a1a" },
    accent: "#f58021",
    button: { style: "hard", radius: "rounded", bg: "#ffffff", text: "#1a1a1a", shadow: "#1a1a1a", hover: "lift" },
    font: { heading: "caveat", body: "space-grotesk" },
    avatar: { shape: "rounded" },
    layout: { links: "list" },
  }),
  preset("photo", "Photo", "Your own background image behind frosted glass.", {
    background: { type: "image", color: "#1b1b1b", overlay: 45, glow: false },
    text: { color: "#ffffff", heading: "#ffffff" },
    accent: "#f58021",
    button: { style: "glass", radius: "pill", bg: "#ffffff", text: "#ffffff", align: "center", hover: "grow" },
    font: { heading: "dm-serif", body: "inter" },
    layout: { style: "classic", links: "list" },
  }),
];

export const DEFAULT_THEME: Theme = THEME_PRESETS[0].theme;

/* ── Rendering ────────────────────────────────────────────────────────────── */

const RADII: Record<Theme["button"]["radius"], string> = {
  square: "4px",
  rounded: "18px",
  pill: "999px",
};

/** Parse a hex or rgb(a) colour to 0–255 channels, or null for anything else. */
function channels(value: string): [number, number, number] | null {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? hex.split("").map((c) => c + c).join("") : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = v.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (rgb) {
    const parts = rgb.split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) return parts as [number, number, number];
  }
  return null;
}

/**
 * The text colour while the hover fill (the accent) sweeps up behind a button.
 * White, as on /help and the old Next Steps cards — the brand look is white on
 * Destiny orange. Only a very light accent (Sunrise's white, a pale pastel)
 * gets near-black instead, because white on white would vanish.
 */
export function readableOn(background: string): string {
  const c = channels(background);
  if (!c) return "#ffffff";
  const [r, g, b] = c.map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

/**
 * The theme as CSS custom properties for the page wrapper. Values are already
 * validated by ThemeSchema; React escapes them into the style attribute.
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  const { background: bg } = theme;
  const surface =
    bg.type === "gradient" ? bg.gradient : bg.color;

  return {
    "--lp-surface": surface,
    "--lp-surface-color": bg.color,
    "--lp-overlay": String(bg.overlay / 100),
    "--lp-blur": `${bg.blur}px`,
    "--lp-text": theme.text.color,
    "--lp-heading": theme.text.heading,
    "--lp-accent": theme.accent,
    "--lp-accent-ink": readableOn(theme.accent),
    "--lp-btn-bg": theme.button.bg,
    "--lp-btn-text": theme.button.text,
    "--lp-btn-shadow": theme.button.shadow,
    "--lp-radius": RADII[theme.button.radius],
    "--lp-font-heading": FONT_OPTIONS[theme.font.heading].css,
    "--lp-font-body": FONT_OPTIONS[theme.font.body].css,
  };
}
