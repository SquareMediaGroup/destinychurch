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
 * Typography roles from the guide. Note: the guide's display face is **Bison**
 * (bold & firm, used for the word mark and occasionally in designs). The web
 * currently approximates that display role with **Anton on the homepage only**
 * — elsewhere use a heavy weight rather than Anton/Bison. The Expo app should
 * bundle the licensed fonts it actually ships and map them to these roles.
 */
export const typography = {
  /** Display / word-mark face — bold, firm. */
  display: "Bison",
  /** Headers. */
  heading: "Arial",
  /** Sub-headers — rounded sans serif. */
  subheading: "Dosis",
  /** Body text. */
  body: "Roboto",
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
