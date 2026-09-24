"use client";

// Small form controls shared by the links page editor's tabs, so every tab
// looks and behaves the same: a collapsible section, a segmented picker for
// short choices (the common case in theme settings — a dropdown hides three
// options behind a click), and a labelled slider.

import { useId, useState } from "react";
import { labelClass } from "@/components/admin/AdminUI";

export function Section({
  title,
  icon,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  /** Shown beside the title while collapsed — the current value at a glance. */
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="overflow-hidden rounded-2xl border border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10 text-destiny-orange"
          aria-hidden="true"
        >
          <span className="material-symbols-rounded text-lg">{icon}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-destiny-grey dark:text-white">{title}</span>
          {summary && !open && (
            <span className="block truncate text-xs text-destiny-grey/50 dark:text-white/50">{summary}</span>
          )}
        </span>
        <span
          className={`material-symbols-rounded text-xl text-destiny-grey/35 transition-transform dark:text-white/35 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>
      {open && (
        <div id={id} className="space-y-5 border-t border-black/5 px-4 pb-5 pt-4 dark:border-white/8">
          {children}
        </div>
      )}
    </section>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: string }[];
  onChange: (next: T) => void;
  help?: string;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-xl bg-black/[0.04] p-1 dark:bg-white/[0.06]"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold transition ${
                selected
                  ? "bg-white text-destiny-grey shadow-sm dark:bg-white/15 dark:text-white"
                  : "text-destiny-grey/55 hover:text-destiny-grey dark:text-white/55 dark:hover:text-white"
              }`}
            >
              {option.icon && (
                <span className="material-symbols-rounded text-base" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              {option.label}
            </button>
          );
        })}
      </div>
      {help && <p className="mt-1.5 text-xs leading-relaxed text-destiny-grey/45 dark:text-white/45">{help}</p>}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <span className="text-xs font-bold tabular-nums text-destiny-grey/55 dark:text-white/55">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-destiny-orange"
      />
    </div>
  );
}
