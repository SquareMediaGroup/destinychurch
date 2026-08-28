"use client";

import { labelClass } from "@/components/admin/AdminUI";
import {
  TONE_LABELS,
  TONE_SWATCH,
  safeUrl,
} from "@/components/blocks/tokens";
import type { Tone } from "@/components/blocks/types";

/**
 * The inspector's input.
 *
 * Spelled out rather than composed from `inputClass` because of the font size,
 * which is load-bearing: iOS Safari zooms the whole page in whenever a focused
 * input is under 16px, and it does not zoom back out. Every tap on a settings
 * field left the admin at 1.3× with the block they were editing off-screen. So
 * it is 16px on touch and drops to the admin's usual 14px at the desktop
 * breakpoint, where the field is in a narrow sidebar and no zoom happens.
 *
 * The vertical padding is the other half: 16px text plus py-2.5 clears 44px, so
 * the fields are hittable without a separate mobile stylesheet.
 */
export const fieldInputClass =
  "w-full rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3.5 py-2.5 text-base text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15 lg:text-sm";

export function FieldShell({
  label,
  help,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {help && (
        <p className="mt-1.5 text-xs leading-relaxed text-destiny-grey/45">{help}</p>
      )}
    </div>
  );
}

export function TextField({
  label,
  help,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (next: string) => void;
}) {
  return (
    <FieldShell label={label} help={help}>
      <input
        className={fieldInputClass}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  help,
  value,
  placeholder,
  rows = 3,
  maxLength,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  onChange: (next: string) => void;
}) {
  return (
    <FieldShell label={label} help={help}>
      <textarea
        className={`${fieldInputClass} resize-y leading-relaxed`}
        value={value}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

export function UrlField({
  label,
  help,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
}) {
  // Blocks are the one place a URL travels from a text input straight into an
  // href, where React does not escape it. Warn as soon as it can't be used.
  const rejected = value.trim() !== "" && safeUrl(value) === null;
  return (
    <FieldShell label={label} help={help}>
      <input
        className={`${fieldInputClass} ${rejected ? "border-destiny-red/50" : ""}`}
        value={value}
        placeholder={placeholder ?? "https://…  /page  #section"}
        onChange={(event) => onChange(event.target.value)}
      />
      {rejected && (
        <p className="mt-1.5 text-xs font-medium text-destiny-red">
          Links must start with https://, mailto:, tel:, / or #. This one will be
          ignored.
        </p>
      )}
    </FieldShell>
  );
}

export function NumberField({
  label,
  help,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  help?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
}) {
  return (
    <FieldShell label={label} help={help}>
      <input
        type="number"
        className={fieldInputClass}
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  help,
  value,
  options,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <FieldShell label={label} help={help}>
      <select
        className={`${fieldInputClass} cursor-pointer`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function ToggleField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    /*
     * The whole row is the switch, not just the 24px-tall track beside it.
     * Everything in the row — label, help text, track — is part of one control,
     * so making the row the button costs nothing and turns a target a thumb
     * misses into one it cannot.
     */
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full items-start justify-between gap-3 rounded-xl bg-[#f5f7fa] px-3.5 py-3 text-left transition active:bg-black/[0.06]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-destiny-grey">{label}</span>
        {help && (
          <span className="mt-0.5 block text-xs leading-relaxed text-destiny-grey/45">
            {help}
          </span>
        )}
      </span>
      {/* Same switch visuals as PostEditor's PublishToggle. */}
      <span
        aria-hidden
        className={`relative mt-0.5 block h-6 w-11 shrink-0 rounded-full transition ${
          value ? "bg-destiny-green" : "bg-black/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function ToneField({
  label,
  help,
  value,
  options,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  options: Tone[];
  onChange: (next: string) => void;
}) {
  // Swatches rather than a <select>: colour is the thing being chosen, and a
  // dropdown of colour names makes you guess.
  return (
    <FieldShell label={label} help={help}>
      <div className="flex flex-wrap gap-2">
        {options.map((tone) => {
          const active = value === tone;
          return (
            <button
              key={tone}
              type="button"
              onClick={() => onChange(tone)}
              aria-pressed={active}
              title={TONE_LABELS[tone]}
              className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition lg:min-h-8 lg:px-2.5 ${
                active
                  ? "border-destiny-orange bg-destiny-orange/10 text-destiny-grey"
                  : "border-black/10 text-destiny-grey/60 hover:border-black/20"
              }`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                style={{ background: TONE_SWATCH[tone] }}
              />
              {TONE_LABELS[tone]}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}
