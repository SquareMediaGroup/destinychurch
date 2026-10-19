// Stroke icons from the design canvas (24px grid, round caps). Decorative by
// default; give `label` when the icon is the only thing saying what it is.

const PATHS = {
  copy: "M9 9h11v11H9zM15 9V4H4v11h5",
  smile: "M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 14a4.5 4.5 0 007 0M9 9.5h.01M15 9.5h.01",
  chat: "M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z",
  megaphone: "M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a4 4 0 010 6M18 6a8 8 0 010 12",
  flag: "M5 21V4M5 4h12l-2.5 4.5L17 13H5",
  personAdd: "M16 21a7 7 0 00-14 0M9 12a4 4 0 100-8 4 4 0 000 8zM19 8v6M16 11h6",
  pause: "M12 21a9 9 0 100-18 9 9 0 000 18zM10 9v6M14 9v6",
  people: "M15 21a6 6 0 00-12 0M9 12a4 4 0 100-8 4 4 0 000 8zM21 21a5 5 0 00-4.5-5M15.5 4.3a4 4 0 010 7.4",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M16 9.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2zM10 19.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2z",
  compose: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5",
  x: "M6 6l12 12M18 6L6 18",
  chevronDown: "M6 9l6 6 6-6",
  sidebar: "M5.5 4h13A2.5 2.5 0 0121 6.5v11a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-11A2.5 2.5 0 015.5 4zM15 4v16",
  bellOff: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0M3 3l18 18",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  reply: "M9 14L4 9l5-5M4 9h11a5 5 0 015 5v6",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  plus: "M12 5v14M5 12h14",
  send: "M12 19V5M5 12l7-7 7 7",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5",
  check: "M5 12l5 5 9-10",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 018 0v4",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  arrowUpRight: "M7 17L17 7M8 7h9v9",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 17, stroke = 1.9, label, color }: { name: IconName; size?: number; stroke?: number; label?: string; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
