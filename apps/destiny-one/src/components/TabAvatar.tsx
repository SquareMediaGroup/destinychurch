// Your profile picture as a circular tab bar icon.
//
// The system tab bar only takes an image source (or a VectorIcon) for its
// icons, not a React view, so a round <Image> can't be handed to it: it's
// dropped with an "Only VectorIcon is supported" warning and the tab shows
// nothing. Instead we draw the photo clipped to a circle (plus the tint ring
// for the selected state) in an off-screen SVG and snapshot it to a PNG data
// URI, which the tab bar loads like any other image.

import { useRef, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Image as SvgImage } from "react-native-svg";

const PT = 28; // Icon size in points.
const SCALE = 3; // Drawn at @3x so it stays sharp on every iPhone.
const PX = PT * SCALE;
const RING = 2 * SCALE;

type IconSource = { uri: string; width: number; height: number; scale: number };
export type TabAvatarIcons = { default: IconSource; selected: IconSource };

/** Snapshot `uri` as two round tab icons (plain, and with a `ringColor` ring). `icons` is null until both are ready. */
export function useTabAvatar(uri: string | null | undefined, ringColor: string) {
  const [icons, setIcons] = useState<TabAvatarIcons | null>(null);
  const pending = useRef<{ key: string } & Partial<TabAvatarIcons>>({ key: "" });
  const key = `${uri}|${ringColor}`;

  // A new photo or tint starts a fresh pair; the old icons stay up until it's ready.
  function done(forKey: string, variant: keyof TabAvatarIcons, base64: string) {
    if (pending.current.key !== forKey) pending.current = { key: forKey };
    pending.current[variant] = { uri: `data:image/png;base64,${base64}`, width: PT, height: PT, scale: SCALE };
    const { default: plain, selected } = pending.current;
    if (plain && selected) setIcons({ default: plain, selected });
  }

  const renderer = uri ? (
    <View pointerEvents="none" style={{ position: "absolute", left: -10000, top: 0 }}>
      <Snapshot key={`d-${key}`} uri={uri} onReady={(b) => done(key, "default", b)} />
      <Snapshot key={`s-${key}`} uri={uri} ringColor={ringColor} onReady={(b) => done(key, "selected", b)} />
    </View>
  ) : null;

  return { icons: uri ? icons : null, renderer };
}

function Snapshot({ uri, ringColor, onReady }: { uri: string; ringColor?: string; onReady: (base64: string) => void }) {
  const svg = useRef<Svg>(null);

  function capture() {
    // onLoad fires just before the bitmap is attached to the native view, so give it a beat.
    setTimeout(() => svg.current?.toDataURL(onReady), 100);
  }

  return (
    <Svg ref={svg} width={PX} height={PX} viewBox={`0 0 ${PX} ${PX}`}>
      <Defs>
        <ClipPath id="round">
          <Circle cx={PX / 2} cy={PX / 2} r={PX / 2} />
        </ClipPath>
      </Defs>
      <SvgImage href={{ uri }} width={PX} height={PX} preserveAspectRatio="xMidYMid slice" clipPath="url(#round)" onLoad={capture} />
      {ringColor && <Circle cx={PX / 2} cy={PX / 2} r={PX / 2 - RING / 2} stroke={ringColor} strokeWidth={RING} fill="none" />}
    </Svg>
  );
}
