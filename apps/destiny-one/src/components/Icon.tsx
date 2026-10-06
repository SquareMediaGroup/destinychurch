// Line icons from the Destiny One design (24×24 viewBox, stroked). One
// component so every screen draws them the same way.

import Svg, { Circle, Path, Rect } from "react-native-svg";

type Shape = { d?: string[]; circles?: [number, number, number][]; rects?: [number, number, number, number, number][] };

const ICONS = {
  back: { d: ["M15 5l-7 7 7 7"] },
  close: { d: ["M6 6l12 12M18 6L6 18"] },
  chevronRight: { d: ["M9 5l7 7-7 7"] },
  chevronDown: { d: ["M6 9l6 6 6-6"] },
  updown: { d: ["M8 10l4-4 4 4M8 14l4 4 4-4"] },
  search: { d: ["M20 20l-3.5-3.5"], circles: [[11, 11, 7]] },
  plus: { d: ["M12 5v14M5 12h14"] },
  mail: { d: ["M3.5 7.5l8.5 6 8.5-6"], rects: [[3, 5, 18, 14, 3]] },
  clock: { d: ["M12 7v5l3.2 2"], circles: [[12, 12, 9]] },
  doc: { d: ["M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z", "M14 3v5h5"] },
  docLines: { d: ["M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z", "M14 3v5h5M9 13h6M9 17h4"] },
  terms: { d: ["M5 4h14v16H5zM9 8h6M9 12h6M9 16h3"] },
  lock: { d: ["M8 11V8a4 4 0 018 0v3"], rects: [[5, 11, 14, 9.5, 2.5]] },
  shield: { d: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"] },
  megaphone: { d: ["M4 10v4h3l7 4V6L7 10z", "M17.5 9a4 4 0 010 6"] },
  pause: { d: ["M9 6v12M15 6v12"] },
  bellOff: { d: ["M6 16V11a6 6 0 019.5-4.9M18 11v5l1.5 2H8", "M10 20a2 2 0 004 0M4 4l16 16"] },
  bell: { d: ["M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z", "M10 20a2 2 0 004 0"] },
  chats: { d: ["M4 11.5c0-4 3.6-7 8-7s8 3 8 7-3.6 7-8 7c-1.1 0-2.2-.2-3.2-.5L4.5 19.5l1.3-3.4A6.6 6.6 0 014 11.5z"] },
  person: { d: ["M5 20a7 7 0 0114 0"], circles: [[12, 8, 4]] },
  people: { d: ["M3.5 19a5.5 5.5 0 0111 0", "M16 14.2a4.5 4.5 0 015 4.8"], circles: [[9, 8, 3.2], [17, 9, 2.5]] },
  sliders: { d: ["M4 7h9M19 7h1M4 17h3M13 17h7"], circles: [[16, 7, 2.6], [10, 17, 2.6]] },
  addPerson: { d: ["M3.5 20a6.5 6.5 0 0113 0M19 8v6M16 11h6"], circles: [[10, 8, 3.5]] },
  check: { d: ["M5 12.5l4.5 4.5L19 7.5"] },
  alert: { d: ["M12 6.5v7M12 17.5v.01"] },
  help: { d: ["M9.6 9.3a2.5 2.5 0 014.8 1c0 1.7-2.4 2.2-2.4 3.7M12 17v.01"], circles: [[12, 12, 9]] },
  forward: { d: ["M15 7l5 5-5 5", "M20 12H10a6 6 0 00-6 6"] },
  info: { d: ["M12 11v5.5M12 7.5v.01"], circles: [[12, 12, 9]] },
  pin: { d: ["M9 4h6l-1 5 3 3v2H7v-2l3-3z", "M12 14v6"] },
  pencil: { d: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"] },
  share: { d: ["M12 3.5v11M8 7.5l4-4 4 4", "M8 11H6.5A1.5 1.5 0 005 12.5v7A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5v-7a1.5 1.5 0 00-1.5-1.5H16"] },
  download: { d: ["M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"] },
  alertCircle: { d: ["M12 7.5v5.5M12 16.5v.01"], circles: [[12, 12, 9]] },
  reply: { d: ["M9 7L4 12l5 5", "M4 12h10a6 6 0 016 6"] },
  copy: { d: ["M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"], rects: [[8, 8, 12, 12, 2.5]] },
  flag: { d: ["M5 21V4M5 4h11l-2 4 2 4H5"] },
  trash: { d: ["M4 7h16M10 7V4.5h4V7M6.5 7l1 13h9l1-13"] },
  block: { d: ["M5.6 5.6l12.8 12.8"], circles: [[12, 12, 9]] },
  send: { d: ["M12 19V5M6 11l6-6 6 6"] },
  camera: { d: ["M4 8h3l2-2.5h6L17 8h3v11H4z"], circles: [[12, 13, 3.5]] },
  photo: { d: ["M4 16l4.5-5 3.5 4 2.5-3L19 16"], rects: [[3, 4, 18, 16, 3]], circles: [[8, 9, 1.6]] },
  poll: { d: ["M6 20V11M12 20V4M18 20v-6"] },
  calendar: { d: ["M3 9.5h18M8 3v4M16 3v4"], rects: [[3, 5, 18, 16, 3]] },
  wifiOff: { d: ["M4 4l16 16M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015-2.6M14 10a10 10 0 015 2.5M2 8.8a15 15 0 015.3-3.3M12 4.5a15 15 0 0110 4.3"], circles: [[12, 20, 0.6]] },
} satisfies Record<string, Shape>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  const s: Shape = ICONS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {s.d?.map((d) => <Path key={d} d={d} />)}
      {s.circles?.map(([cx, cy, r]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
      {s.rects?.map(([x, y, w, h, rx]) => <Rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={rx} />)}
    </Svg>
  );
}
