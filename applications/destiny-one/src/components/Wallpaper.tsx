// The built-in conversation wallpapers (src/theme/appearance.ts lists them).
// Each is drawn in code with react-native-svg rather than shipped as a photo:
// it stays sharp on every screen, weighs almost nothing, and switches between
// its light and dark colours with the phone. The shapes are deliberately
// quiet, and the unit tests check that message text and bubbles stay legible
// on the darkest and lightest part of every one.

import { useId, useMemo } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, Rect, Stop } from "react-native-svg";
import { MAX_BLUR_RADIUS, type WallpaperPattern, type WallpaperTone } from "@/theme/appearance";
import { useTheme } from "@/theme/tokens";

const W = 390;
const H = 844;

/** A row of gentle hills, filled down to the bottom edge. */
function hill(baseY: number, amp: number, wavelength: number, phase: number): string {
  let d = `M0 ${H} L0 ${baseY}`;
  for (let x = 0; x <= W + 10; x += 10) d += ` L${x} ${(baseY + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amp).toFixed(1)}`;
  return `${d} L${W} ${H} Z`;
}

/** A wave line across the width (stroked, not filled). */
function wave(y: number, amp: number, wavelength: number, phase: number): string {
  let d = "";
  for (let x = 0; x <= W + 6; x += 6) d += `${x === 0 ? "M" : "L"}${x} ${(y + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amp).toFixed(1)} `;
  return d;
}

/** Thin wedges fanning out from the bottom centre. */
function rays(count: number): string[] {
  const cx = W / 2;
  const cy = H + 60;
  const reach = 1200;
  return Array.from({ length: count }, (_, i) => {
    const a0 = Math.PI + (i / count) * Math.PI;
    const a1 = a0 + (Math.PI / count) * 0.5;
    const p = (a: number) => `${(cx + Math.cos(a) * reach).toFixed(1)} ${(cy + Math.sin(a) * reach).toFixed(1)}`;
    return `M${cx} ${cy} L${p(a0)} L${p(a1)} Z`;
  });
}

function Shapes({ pattern, ink, uid }: { pattern: WallpaperPattern; ink: string; uid: string }) {
  const paths = useMemo(() => {
    switch (pattern) {
      case "hills":
        return [hill(560, 26, 260, 0.4), hill(640, 22, 200, 2.1), hill(720, 18, 170, 4.2)];
      case "waves":
        return Array.from({ length: 14 }, (_, i) => wave(90 + i * 62, 9 + (i % 3) * 3, 150 + (i % 4) * 25, i * 0.9));
      case "sunburst":
        return rays(18);
      default:
        return [];
    }
  }, [pattern]);

  switch (pattern) {
    case "hills":
      return (
        <G>
          {paths.map((d, i) => (
            <Path key={i} d={d} fill={ink} opacity={0.5 + i * 0.25} />
          ))}
        </G>
      );
    case "waves":
      return (
        <G fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round">
          {paths.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
      );
    case "sunburst":
      return (
        <G>
          {paths.map((d, i) => (
            <Path key={i} d={d} fill={ink} opacity={0.55} />
          ))}
        </G>
      );
    case "dots":
      return (
        <>
          <Defs>
            <Pattern id={`${uid}-dots`} width={32} height={32} patternUnits="userSpaceOnUse">
              <Circle cx={8} cy={8} r={2.2} fill={ink} />
              <Circle cx={24} cy={24} r={2.2} fill={ink} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-dots)`} />
        </>
      );
    case "contours":
      return (
        <G fill="none" stroke={ink} strokeWidth={1.6}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Circle key={`a${i}`} cx={90} cy={190} r={40 + i * 34} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Circle key={`b${i}`} cx={330} cy={640} r={30 + i * 36} />
          ))}
        </G>
      );
    default:
      return null;
  }
}

export function Wallpaper({ pattern, tone, style }: { pattern: WallpaperPattern; tone: WallpaperTone; style?: StyleProp<ViewStyle> }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg pointerEvents="none" style={[StyleSheet.absoluteFill, style]} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tone.stops[0]} />
          <Stop offset="1" stopColor={tone.stops[1]} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-bg)`} />
      <Shapes pattern={pattern} ink={tone.ink} uid={uid} />
    </Svg>
  );
}

/**
 * A photo behind the chat. The layer over it is the page colour, so in dark mode
 * "dim" darkens it and in light mode it fades it toward white: either way the
 * text that sits on it stays on a background of the colours it was designed for.
 */
export function PhotoWallpaper({ source, dim, blur, style }: { source: ImageSourcePropType; dim: number; blur: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const radius = Math.round(blur * MAX_BLUR_RADIUS);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: t.bg }, style]}>
      {/* Blurring fades the picture's own edges, so it's drawn slightly larger to keep them off screen. */}
      <Image
        source={source}
        blurRadius={radius}
        resizeMode="cover"
        accessible={false}
        style={[StyleSheet.absoluteFill, { transform: [{ scale: 1 + Math.min(radius, 24) / 120 }] }]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg, opacity: dim }]} />
    </View>
  );
}

/** Whatever wallpaper the person has chosen (pattern or photo), or nothing for plain. */
export function Backdrop({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  if (t.photo) return <PhotoWallpaper source={t.photo.source} dim={t.photo.dim} blur={t.photo.blur} style={style} />;
  if (t.wall) return <Wallpaper pattern={t.wall.def.pattern} tone={t.wall.tone} style={style} />;
  return null;
}
