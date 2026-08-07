import type { Tone } from "./types";

/**
 * The site's design vocabulary, as reusable class strings.
 *
 * These values are not invented — they are the de facto tokens already
 * hardcoded across the codebase (`components/events/EventCard.tsx`,
 * `components/ministry/{FeatureGrid,AgeGroupCards,FactStrip}.tsx`,
 * `components/home/WhatsOnSection.tsx`, `app/kids/page.tsx` and others).
 * Blocks reuse them so admin-authored content is indistinguishable from
 * hand-built pages.
 *
 * Two things to know before editing anything here:
 *
 *  1. `h1,h2,h3 { font-family: var(--font-heading) }` (Arial) is UNLAYERED in
 *     globals.css and outranks every Tailwind font utility. Any block heading
 *     that wants Roboto must carry the inline escape hatch used throughout
 *     `components/ministry/`: style={{ fontFamily: FONT_ROBOTO }}.
 *
 *  2. Blocks render in four different reading columns (posts, training, jobs,
 *     shop) whose widths differ. Nothing here may assume a fixed width —
 *     grids use container queries, not viewport breakpoints.
 */

/** Inline escape hatch for the unlayered Arial rule on h1–h3. */
export const FONT_ROBOTO = "var(--font-roboto), system-ui, sans-serif";

/** Display font. Used sparingly — numerals and eyebrow accents only. */
export const FONT_ANTON = "var(--font-anton)";

/**
 * The standard card: 20px radius, hairline border, two-layer shadow that
 * deepens on hover with a 1px lift.
 */
export const CARD_SHELL =
  "rounded-[20px] border border-black/[0.07] shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition-all duration-300";

/** Add to CARD_SHELL for interactive cards. Omit for static ones. */
export const CARD_HOVER =
  "hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_16px_36px_-12px_rgba(16,24,40,.16)]";

/** Small orange uppercase label above a heading. */
export const EYEBROW =
  "text-xs font-bold uppercase tracking-widest text-destiny-orange";

/** In-card label — smaller and greyer than EYEBROW. */
export const CARD_LABEL =
  "text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-grey/45";

/**
 * Section heading. Pair with style={{ fontFamily: FONT_ROBOTO }} — see note 1.
 *
 * Fluid via container query units rather than viewport breakpoints, so it sizes
 * to the column it lands in (see note 2). `[data-dc-block]` carries
 * `container-type: inline-size` in globals.css to make `cqi` resolve.
 *
 * The underscores are load-bearing: they become spaces, and CSS requires
 * whitespace around `+` inside clamp()/calc(). Without them the whole
 * declaration is invalid and silently dropped, and the heading falls back to
 * the generic `.rte-content h2` size.
 */
export const HEADING =
  "text-[clamp(1.5rem,1.1rem_+_1.6cqi,2rem)] font-black leading-tight tracking-[-0.02em] text-destiny-grey";

/** Card/item title. Roboto semibold with tight negative tracking. */
export const CARD_TITLE =
  "text-[19px] font-semibold tracking-[-0.017em] text-destiny-grey";

/** Body copy inside a block. */
export const BODY = "text-sm leading-relaxed text-destiny-grey/70";

/** Secondary/supporting copy. */
export const BODY_MUTED = "text-sm leading-relaxed text-destiny-grey/60";

/** Primary pill button. */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110";

/** Secondary pill button, for use on light backgrounds. */
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-destiny-grey/15 px-7 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-grey/40 hover:bg-black/[0.03]";

/** Tertiary text link with a trailing arrow. */
export const BTN_TEXT =
  "inline-flex items-center gap-1.5 text-sm font-bold text-destiny-orange transition hover:gap-2.5";

/** Surface background per tone. `light` and `muted` alternate down a page. */
export const TONE_SURFACE: Record<Tone, string> = {
  light: "bg-white",
  muted: "bg-[#f5f7fa]",
  orange: "bg-destiny-orange/[0.07]",
  blue: "bg-destiny-blue/[0.06]",
  green: "bg-destiny-green/[0.06]",
  purple: "bg-destiny-purple/[0.06]",
};

/** Accent (icon, rule, border) per tone. */
export const TONE_ACCENT: Record<Tone, string> = {
  light: "text-destiny-grey/60",
  muted: "text-destiny-grey/60",
  orange: "text-destiny-orange",
  blue: "text-destiny-blue",
  green: "text-destiny-green",
  purple: "text-destiny-purple",
};

/** Solid accent background, for icon chips and coloured bands. */
export const TONE_SOLID: Record<Tone, string> = {
  light: "bg-destiny-grey/10",
  muted: "bg-destiny-grey/10",
  orange: "bg-destiny-orange",
  blue: "bg-destiny-blue",
  green: "bg-destiny-green",
  purple: "bg-destiny-purple",
};

export const TONE_BORDER: Record<Tone, string> = {
  light: "border-black/[0.07]",
  muted: "border-black/[0.07]",
  orange: "border-destiny-orange/25",
  blue: "border-destiny-blue/25",
  green: "border-destiny-green/25",
  purple: "border-destiny-purple/25",
};

/** Tone options offered in the inspector, in a sensible visual order. */
export const TONE_OPTIONS: Tone[] = [
  "light",
  "muted",
  "orange",
  "blue",
  "green",
  "purple",
];

export const TONE_LABELS: Record<Tone, string> = {
  light: "White",
  muted: "Grey",
  orange: "Orange",
  blue: "Blue",
  green: "Green",
  purple: "Purple",
};

/** Swatch colours for the inspector's tone picker. */
export const TONE_SWATCH: Record<Tone, string> = {
  light: "#ffffff",
  muted: "#f5f7fa",
  orange: "#f58021",
  blue: "#0857ba",
  green: "#028002",
  purple: "#8106b1",
};

/**
 * Guard for anything used as an href or src.
 *
 * React escapes props it renders as children, but NOT values placed in `href`
 * or `src` — `javascript:` there is a live XSS vector. Admin-only surface, but
 * the check is three lines and blocks are the one place a URL travels from a
 * text input straight into an attribute.
 */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url) ? url : null;
}
