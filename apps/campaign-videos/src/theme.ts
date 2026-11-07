import { loadFont } from "@remotion/fonts";
import { Easing, staticFile } from "remotion";

// Brand typography (DC Brand Asset Style Guide): Roboto for body, Dosis for
// sub headers. Anton stands in for the display face the website's hero uses.
// The files are Google Fonts' variable fonts (OFL), kept in public/fonts so
// renders don't depend on reaching fonts.gstatic.com.
export const roboto = "Roboto";
export const dosis = "Dosis";
export const anton = "Anton";

void loadFont({ family: roboto, url: staticFile("fonts/Roboto.woff2"), weight: "100 900" });
void loadFont({ family: dosis, url: staticFile("fonts/Dosis.woff2"), weight: "200 800" });
void loadFont({ family: anton, url: staticFile("fonts/Anton.woff2"), weight: "400" });

// Light, product-film look: near-white page, near-black ink, the brand orange as the one accent.
export const C = {
  page: "#F5F5F7",
  white: "#FFFFFF",
  ink: "#1D1D1F",
  muted: "#6E6E73",
  // Brand orange (#F58021) is too light for text on white; this deeper tone is the same hue.
  accent: "#D2600A",
  orange: "#F58021",
  grey: "#363F48",
};

export const FPS = 30;

/** Aggressive ease in and out: slow off the mark, fast through the middle, a long soft landing. */
export const EASE = Easing.bezier(0.86, 0, 0.07, 1);
