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
    <div className="flex items-center gap-1 rounded-lg bg-[#f5f7fa] p-1">
      {ITEMS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          title={`${item.label} (${BREAKPOINT_WIDTHS[item.value]}px)`}
          className={`flex h-7 w-9 items-center justify-center rounded-md transition ${
            value === item.value
              ? "bg-white text-destiny-orange shadow-sm"
              : "text-destiny-grey/50 hover:text-destiny-grey"
          }`}
        >
          <span className="material-symbols-rounded text-base">{item.icon}</span>
        </button>
      ))}
    </div>
  );
}
