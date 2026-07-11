"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15";

export const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45";

export const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

export const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]";

export function HrHeader({
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

const BADGE_TONES: Record<string, string> = {
  green: "bg-destiny-green/10 text-destiny-green",
  orange: "bg-destiny-orange/15 text-destiny-orange",
  red: "bg-destiny-red/10 text-destiny-red",
  grey: "bg-black/5 text-destiny-grey/55",
  blue: "bg-destiny-blue/10 text-destiny-blue",
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

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white/50 px-6 py-16 text-center">
      <span className="material-symbols-rounded mb-3 text-4xl text-destiny-grey/25">
        {icon}
      </span>
      <p className="font-bold text-destiny-grey/70">{title}</p>
      {hint && <p className="mt-1 text-sm text-destiny-grey/45">{hint}</p>}
    </div>
  );
}
