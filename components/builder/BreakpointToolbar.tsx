"use client";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
};

const ITEMS: Array<{ value: Breakpoint; icon: string; label: string }> = [
  { value: "mobile", icon: "smartphone", label: "Mobile" },
  { value: "tablet", icon: "tablet", label: "Tablet" },
  { value: "desktop", icon: "desktop_windows", label: "Desktop" },
];

type Props = {
  value: Breakpoint;
  onChange: (b: Breakpoint) => void;
};

export default function BreakpointToolbar({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-white/5 p-0.5">
      {ITEMS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          title={`${item.label} (${BREAKPOINT_WIDTHS[item.value]}px)`}
          className={`flex h-7 w-9 items-center justify-center rounded transition ${
            value === item.value
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <span className="material-symbols-rounded text-[18px]">{item.icon}</span>
        </button>
      ))}
    </div>
  );
}
