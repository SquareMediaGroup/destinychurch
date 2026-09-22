"use client";

// A colour (or gradient) control for the links page theme editor: a swatch
// and a text box, with react-best-gradient-color-picker in a popover.
//
// The text box is there for people who have the brand hex to hand; the
// picker for everyone else. Whatever either produces is checked against the
// same rules ThemeSchema applies on save, and an invalid value is shown but
// not committed — the preview never renders something the server would reject.

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { labelClass } from "@/components/admin/AdminUI";
import { fieldInputClass } from "@/components/admin/blocks/fields/BasicFields";
import { isThemeColor, isThemeGradient } from "@/lib/linkPages/theme";

// Client-only and sizeable: loaded the first time a popover opens.
const ColorPicker = dynamic(() => import("react-best-gradient-color-picker"), {
  ssr: false,
  loading: () => <div className="h-[300px] w-[264px] animate-pulse rounded-xl bg-black/5" />,
});

const BRAND_PRESETS = [
  "#f58021",
  "#0857ba",
  "#8106b1",
  "#028002",
  "#d9366b",
  "#2d2d2d",
  "#1c1c1c",
  "#ffffff",
  "#f4f4f0",
  "#fff4d6",
  "rgba(255,255,255,0)",
  "#111111",
];

export default function ColorField({
  label,
  value,
  onChange,
  gradient = false,
  help,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Gradient mode: the picker edits stops and angle, and only gradients are accepted. */
  gradient?: boolean;
  help?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const wrap = useRef<HTMLDivElement>(null);
  const valid = gradient ? isThemeGradient : isThemeColor;

  // Follow the committed value when it changes from outside (a preset was
  // picked) — adjusted during render, React's pattern for derived state.
  const [basis, setBasis] = useState(value);
  if (basis !== value) {
    setBasis(value);
    setDraft(value);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (next: string) => {
    setDraft(next);
    if (valid(next)) onChange(next.trim());
  };

  return (
    <div ref={wrap} className="relative">
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-expanded={open}
          className="h-11 w-11 shrink-0 rounded-xl border border-black/10 shadow-inner dark:border-white/10"
          style={{ background: valid(draft) ? draft : value }}
        />
        {!gradient && (
          <input
            id={id}
            className={`${fieldInputClass} font-mono ${valid(draft) ? "" : "border-destiny-red/50"}`}
            value={draft}
            spellCheck={false}
            onChange={(e) => commit(e.target.value)}
            onBlur={() => setDraft(value)}
          />
        )}
        {gradient && (
          <button
            id={id}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`${fieldInputClass} text-left text-destiny-grey/60 dark:text-white/60`}
          >
            Edit gradient
          </button>
        )}
      </div>
      {help && <p className="mt-1.5 text-xs text-destiny-grey/45 dark:text-white/45">{help}</p>}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 rounded-2xl border border-black/10 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-destiny-grey-800">
          <ColorPicker
            value={valid(draft) ? draft : value}
            onChange={(next) => commit(next.replace(/\s+/g, " "))}
            width={264}
            height={180}
            // The field's mode is fixed: a gradient field only takes gradients,
            // a colour field only colours — so no solid/gradient switch.
            hideColorTypeBtns
            hideInputType
            hideEyeDrop
            hideAdvancedSliders
            hideColorGuide
            presets={BRAND_PRESETS}
            disableDarkMode
          />
        </div>
      )}
    </div>
  );
}
