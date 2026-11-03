import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

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

// Pillar palette + neutrals from the brand guide.
export const C = {
  red: "#FD0000",
  orange: "#F58021",
  blue: "#0857BA",
  green: "#028002",
  purple: "#8106B1",
  grey: "#363F48",
  ink: "#0B0B0C",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.62)",
};

export const FPS = 30;
export const s = (seconds: number) => Math.round(seconds * FPS);

// Apple-like ease-out.
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
