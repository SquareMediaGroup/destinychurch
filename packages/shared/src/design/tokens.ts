// Destiny Church design tokens — the canonical brand palette + typography,
// sourced from the DC Brand Asset Style Guide (27/09/22) and kept in lockstep
// with the web theme in `app/globals.css` (the hex values here match its
// `--color-destiny-*` variables exactly). Framework-agnostic plain constants so
// both the web app and the React Native / Expo app consume one source of truth.
//
// Logo usage rules from the guide (enforce in UI, not encodable as tokens):
//  - Prefer the full-colour horizontal logo on white / black / dark-shade
//    backgrounds; use the one-colour (white) logo on lighter/darker or pillar-
//    coloured backgrounds where the full-colour mark would clash.
//  - Never place the single-colour logo icon on its own; when the icon appears
//    alone on a conflicting background, use the circular grey/white-backed version.
//  - Only the horizontal lockup is used; never put the icon on the word mark.

/**
 * The Five Pillars of Destiny Church — each pillar maps to one logo colour and
 * one meaning. This mapping is intrinsic to the brand (logo, colours, icons).
 */
export const PILLARS = {
  magnify: { color: "#FD0000", label: "Magnify", icon: "heart" },
  mission: { color: "#0857BA", label: "Mission", icon: "fish" },
  ministry: { color: "#8106B1", label: "Ministry", icon: "puzzle" },
  membership: { color: "#F58021", label: "Membership", icon: "house" },
  maturity: { color: "#028002", label: "Maturity", icon: "tree" },
} as const;

export type PillarKey = keyof typeof PILLARS;

/** The pillar palette as flat colour tokens. */
export const colors = {
  // Pillar palette
  red: "#FD0000",
  orange: "#F58021", // the preferred accent colour
  orangeDark: "#D96D10", // derived shade for hover/pressed states (matches web)
  blue: "#0857BA",
  green: "#028002",
  purple: "#8106B1",

  // Neutral palette
  white: "#FFFFFF",
  black: "#000000",
  /** "Bluish Grey" — the brand's dark neutral; also the web foreground colour. */
  grey: "#363F48",
} as const;

/** Orange is explicitly the brand's preferred accent colour. */
export const accentColor = colors.orange;

/**
 * Text colours for secondary copy, kept byte-identical to `--color-muted` and
 * `--color-subtle` in `app/globals.css`.
 *
 * These are solid colours rather than an alpha on `colors.grey` on purpose.
 * The web used to fade the brand grey for "quieter" text and every step that
 * looked quiet enough also fell below the WCAG AA floor of 4.5:1 — grey at 60%
 * on white is 3.4:1, at 40% it is 2.1:1. Measured on white these are 5.9:1 and
 * 4.7:1; `tests/unit/contrast.spec.ts` pins them there.
 *
 * `onDark*` are alphas because the backdrop varies. Over `colors.grey` they are
 * 7.8:1 and 6.4:1. Over a PHOTOGRAPH neither is sufficient by itself — darken
 * the scrim rather than reaching for a brighter text colour.
 */
export const textColors = {
  /** Secondary body copy, card descriptions. */
  muted: "#5B6570",
  /** Metadata, captions, labels. The quietest colour allowed to carry meaning. */
  subtle: "#6B7580",
  /** Secondary copy on a dark surface. */
  onDarkMuted: "rgba(255, 255, 255, 0.82)",
  /** Metadata on a dark surface. */
  onDarkSubtle: "rgba(255, 255, 255, 0.72)",
} as const;

/**
 * The rainbow brand gradient (as used for the logo mark and on the web via
 * `app/globals.css`). Ordered stops; wrap back to orange to loop seamlessly.
 */
export const brandGradientStops = [
  colors.orange,
  colors.red,
  colors.purple,
  colors.blue,
  colors.green,
  colors.orange,
] as const;

/**
 * Typography roles — mirrors the fonts the website actually ships (see
 * `app/layout.tsx` + `app/globals.css`), NOT the brand guide's Bison/Dosis,
 * which are not used. The three custom faces (Roboto, Anton, Playfair Display)
 * are Google Fonts, so the Expo app can bundle them via `@expo-google-fonts/*`.
 * Arial is a system font on web; iOS falls back to San Francisco.
 */
export const typography = {
  /** Body text — Roboto (web: `--font-roboto`). */
  body: "Roboto",
  /** Headers — Arial on web (system font; iOS → San Francisco). */
  heading: "Arial",
  /**
   * Display / hero — Anton. Used sparingly: homepage/hero only, matching the
   * web. Elsewhere use a heavy Roboto weight, never Anton (and never Bison).
   */
  display: "Anton",
  /** Serif accent — Playfair Display (web: `--font-playfair`). */
  serif: "Playfair Display",
} as const;

/**
 * Brand voice, distilled from the guide — for copy in-app (onboarding, empty
 * states, notifications). Authentic, kind, thoughtful; friendly, patient, warm;
 * clear, joyful, confident; helpful, respectful, engaged. "We / Our / Us"
 * family language — everyone is honoured and valued: the Destiny Family.
 */
export const brandVoice = [
  "authentic",
  "kind",
  "thoughtful",
  "friendly",
  "patient",
  "warm",
  "clear",
  "joyful",
  "confident",
  "helpful",
  "respectful",
  "engaged",
] as const;
