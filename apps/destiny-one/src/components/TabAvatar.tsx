// Your profile picture as a circular tab bar icon.
//
// The system tab bar only takes an image source (or a VectorIcon) for its
// icons, not a React view, so a round <Image> can't be handed to it: it's
// dropped with an "Only VectorIcon is supported" warning and the tab shows
// nothing. Instead we draw the photo clipped to a circle (plus the tint ring
// for the selected state) in an off-screen SVG and snapshot it to a PNG data
// URI, which the tab bar loads like any other image.

import { useEffect, useRef, useState } from "react";
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
  // The plain icon depends only on the photo; only the ring variant follows the tint (which changes with light/dark).
  const plain = useRef<{ uri: string; icon: IconSource } | null>(null);
  const ring = useRef<{ key: string; icon: IconSource } | null>(null);
  const ringKey = `${uri}|${ringColor}`;

  // Publish whenever both halves match the current photo/tint; the old icons stay up until then.
  function publish() {
    const p = plain.current;
    const r = ring.current;
    if (p && r && p.uri === uri && r.key === ringKey) setIcons({ default: p.icon, selected: r.icon });
  }
  function toIcon(base64: string): IconSource {
    return { uri: `data:image/png;base64,${base64}`, width: PT, height: PT, scale: SCALE };
  }

  const renderer = uri ? (
    <View pointerEvents="none" style={{ position: "absolute", left: -10000, top: 0 }}>
      <Snapshot
        key={`d-${uri}`}
        uri={uri}
        onReady={(b) => {
          plain.current = { uri, icon: toIcon(b) };
          publish();
        }}
      />
      <Snapshot
        key={`s-${ringKey}`}
        uri={uri}
        ringColor={ringColor}
        onReady={(b) => {
          ring.current = { key: ringKey, icon: toIcon(b) };
          publish();
        }}
      />
    </View>
  ) : null;

  return { icons: uri ? icons : null, renderer };
}

function Snapshot({ uri, ringColor, onReady }: { uri: string; ringColor?: string; onReady: (base64: string) => void }) {
  const svg = useRef<Svg>(null);

  const captured = useRef(false);

  function capture() {
    if (captured.current) return;
    captured.current = true;
    // onLoad fires just before the bitmap is attached to the native view, so give it a beat.
    setTimeout(() => svg.current?.toDataURL(onReady), 100);
  }

  // A cached photo may not fire onLoad again when this remounts (e.g. after a light/dark switch), so snapshot anyway.
  useEffect(() => {
    const id = setTimeout(capture, 1500);
    return () => clearTimeout(id);
  }, []);

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
