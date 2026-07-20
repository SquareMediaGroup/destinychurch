// App theme — maps the canonical @destiny/shared design tokens onto the shapes
// the React Native app uses (font-family keys, spacing scale, radii). The colour
// values all come from the shared brand palette, so web and app never drift.
import {
  colors,
  accentColor,
  PILLARS,
  brandGradientStops,
} from "@destiny/shared";

/**
 * Font-family keys. These strings must match the fonts registered via
 * `useFonts` in `app/_layout.tsx` (the @expo-google-fonts export names).
 * `heading` uses Arial to mirror the web; on iOS Arial is a system face.
 */
export const fonts = {
  body: "Roboto_400Regular",
  bodyMedium: "Roboto_500Medium",
  bodyBold: "Roboto_700Bold",
  bodyBlack: "Roboto_900Black",
  /** Display/hero — Anton. Homepage/hero only, per the brand rules. */
  display: "Anton_400Regular",
  /** Serif accent — Playfair Display. */
  serif: "PlayfairDisplay_600SemiBold",
  heading: "Arial",
} as const;

export const theme = {
  colors: {
    ...colors,
    background: colors.white,
    text: colors.grey,
    textMuted: "rgba(54, 63, 72, 0.6)",
    border: "rgba(54, 63, 72, 0.12)",
    accent: accentColor,
  },
  fonts,
  /** 4pt spacing scale. */
  spacing: (n: number) => n * 4,
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
} as const;

export { PILLARS, brandGradientStops };
