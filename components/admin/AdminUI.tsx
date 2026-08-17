"use client";

// The shared admin UI kit.
//
// These primitives used to live in components/admin/hr/HrUI.tsx, which Posts
// and Training already imported from — a shared kit hiding inside a feature
// folder under a name ("HrHeader") that had nothing to do with what it did.
// It now lives here; HrUI re-exports so existing imports keep working.
//
// Everything is a plain string or a small component so pages stay readable and
// nothing needs a runtime class-merging library.

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

/* ── Class tokens ──────────────────────────────────────────────────────────── */

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15";

export const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45";

export const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

export const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] disabled:opacity-60";

export const dangerBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-destiny-red px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

/** Square icon-only button for row actions. */
export const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-orange";

export const cardClass =
  "rounded-3xl border border-black/5 bg-white shadow-sm";

/* ── Page header ───────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <a
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-destiny-grey/45 transition hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            {back.label}
          </a>
        )}
        <h1 className="text-2xl font-black text-destiny-grey md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-destiny-grey/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Badge ─────────────────────────────────────────────────────────────────── */

const BADGE_TONES: Record<string, string> = {
  green: "bg-destiny-green/10 text-destiny-green",
  orange: "bg-destiny-orange/15 text-destiny-orange",
  red: "bg-destiny-red/10 text-destiny-red",
  grey: "bg-black/5 text-destiny-grey/55",
  blue: "bg-destiny-blue/10 text-destiny-blue",
  purple: "bg-destiny-purple/10 text-destiny-purple",
};

export function Badge({ tone = "grey", children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${BADGE_TONES[tone] ?? BADGE_TONES.grey}`}
    >
      {children}
    </span>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────────────── */

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div
        className="my-8 w-full max-w-lg rounded-3xl border border-black/5 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-destiny-grey">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
            aria-label="Close"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white/50 px-6 py-16 text-center">
      <span className="material-symbols-rounded mb-3 text-4xl text-destiny-grey/25">
        {icon}
      </span>
      <p className="font-bold text-destiny-grey/70">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-destiny-grey/45">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Error banner ──────────────────────────────────────────────────────────── */

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm font-medium text-destiny-red"
    >
      <span className="material-symbols-rounded mt-px text-base">error</span>
      <span>{children}</span>
    </p>
  );
}

/* ── Search input ──────────────────────────────────────────────────────────── */

/**
 * The list search box. Registers itself with the "/" shortcut so pressing
 * slash anywhere on a list page starts typing here — the single biggest
 * time-saver on a page with a hundred rows.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  autoFocus = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
        return;
      }
      e.preventDefault();
      ref.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`relative min-w-0 flex-1 sm:max-w-xs ${className}`}>
      <span className="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-destiny-grey/35">
        search
      </span>
      <input
        ref={ref}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-9 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/35 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-base">close</span>
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-black/10 bg-[#f5f7fa] px-1.5 py-0.5 text-[10px] font-bold text-destiny-grey/35 sm:block">
          /
        </kbd>
      )}
    </div>
  );
}

/* ── Filter chips ──────────────────────────────────────────────────────────── */

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Status filters as chips rather than a <select>: on these lists there are
 * never more than about five states, and a chip row shows the counts without a
 * click.
 */
export function FilterChips({
  options,
  value,
  onChange,
  label = "Filter",
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              active
                ? "bg-destiny-orange text-white shadow-sm"
                : "border border-black/10 bg-white text-destiny-grey/60 hover:bg-[#f5f7fa] hover:text-destiny-grey"
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                  active ? "bg-white/25" : "bg-black/5 text-destiny-grey/50"
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── List toolbar ──────────────────────────────────────────────────────────── */

/**
 * The strip above every list: search on the left, filters next to it, a
 * "showing x of y" count, and room for bulk actions. Consistent placement
 * means you stop hunting for the search box between sections.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  total,
  shown,
  noun = "item",
  children,
  right,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  total: number;
  shown: number;
  noun?: string;
  /** Bulk actions and the like, shown under the toolbar when present. */
  children?: ReactNode;
  right?: ReactNode;
}) {
  const filtered = shown !== total;
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder ?? `Search ${noun}s`}
        />
        {filters}
        <p className="ml-auto shrink-0 text-xs font-bold tabular-nums text-destiny-grey/40">
          {filtered ? `${shown} of ${total}` : `${total}`} {noun}
          {total === 1 && !filtered ? "" : "s"}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ── Sortable table header ─────────────────────────────────────────────────── */

export function SortHeader({
  label,
  field,
  active,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  field: string;
  active: boolean;
  direction: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}) {
  return (
    <th className={`px-5 py-3.5 ${className}`} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider transition hover:text-destiny-grey ${
          active ? "text-destiny-orange" : ""
        }`}
      >
        {label}
        <span
          className={`material-symbols-rounded text-base transition ${
            active ? "opacity-100" : "opacity-0"
          }`}
        >
          {direction === "asc" ? "arrow_upward" : "arrow_downward"}
        </span>
      </button>
    </th>
  );
}

/* ── Loading skeletons ─────────────────────────────────────────────────────── */

/**
 * Skeleton rows instead of the "Loading…" text these pages used to show. The
 * page keeps its shape while data arrives, so nothing jumps under the cursor.
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className={`overflow-hidden ${cardClass}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="divide-y divide-black/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-3.5 animate-pulse rounded bg-black/5"
                style={{ width: c === 0 ? "34%" : `${Math.max(12, 22 - c * 3)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading state for a detail page, where a table skeleton would be the wrong
 * shape. Replaces the bare "Loading…" text those pages used, which gave no
 * indication anything was actually happening.
 */
export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-8 py-16 text-sm font-bold text-destiny-grey/40"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="material-symbols-rounded animate-spin text-xl">
        progress_activity
      </span>
      {label}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${cardClass} h-24 animate-pulse`} />
      ))}
    </div>
  );
}

/* ── Toggle ────────────────────────────────────────────────────────────────── */

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-destiny-orange" : "bg-black/10"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ── Bulk action bar ───────────────────────────────────────────────────────── */

export function BulkBar({
  count,
  noun = "item",
  onClear,
  children,
}: {
  count: number;
  noun?: string;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destiny-orange/25 bg-destiny-orange/5 px-4 py-2.5">
      <p className="text-sm font-bold text-destiny-grey">
        {count} {noun}
        {count === 1 ? "" : "s"} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-bold text-destiny-grey/50 transition hover:text-destiny-grey"
      >
        Clear
      </button>
    </div>
  );
}

/* ── Keyboard hint ─────────────────────────────────────────────────────────── */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-black/10 bg-[#f5f7fa] px-1.5 py-0.5 font-sans text-[10px] font-bold text-destiny-grey/50">
      {children}
    </kbd>
  );
}
