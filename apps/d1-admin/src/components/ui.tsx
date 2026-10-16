// Small shared pieces used across the app, all from the design canvas.

import { useEffect, useRef, type ReactNode } from "react";
import { initials } from "@/lib/format";
import { Icon } from "@/components/Icon";

export function Avatar({ name, size = 32, square = false, ann = false, url }: { name: string; size?: number; square?: boolean; ann?: boolean; url?: string | null }) {
  const radius = square ? Math.round(size * 0.28) : size / 2;
  return (
    <span className={`av${ann ? " ann" : ""}`} style={{ width: size, height: size, borderRadius: radius, fontSize: Math.max(9, Math.round(size * 0.37)) }} aria-hidden="true">
      {ann ? <Icon name="megaphone" size={Math.round(size * 0.5)} /> : url ? <img src={url} alt="" /> : initials(name)}
    </span>
  );
}

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (T | [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="seg">
      {options.map((o) => {
        const [v, text] = Array.isArray(o) ? o : [o, o];
        return (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{ width: 38, height: 22, border: 0, borderRadius: 11, background: on ? "var(--orange)" : "var(--fill2)", padding: 2, flex: "none", display: "flex" }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.25)", transform: on ? "translateX(16px)" : "none", transition: "transform .15s" }} />
    </button>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header drag" data-tauri-drag-region>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <h1>{title}</h1>
        {sub ? <span className="sub ellipsis">{sub}</span> : null}
      </div>
      {children}
    </header>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {sub ? <span>{sub}</span> : null}
    </div>
  );
}

export function Loading({ what = "Loading" }: { what?: string }) {
  return <div className="empty"><span>{what}…</span></div>;
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="error" role="alert">{error instanceof Error ? error.message : String(error)}</div>;
}

/** A modal sheet, dropped from the title bar like the Mac's own. Escape closes it. */
export function Sheet({ width = 380, label, onClose, children }: { width?: number; label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--scrim)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "52px 16px 16px", zIndex: 20 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="scroll"
        style={{ width: "100%", maxWidth: width, maxHeight: "calc(100% - 80px)", borderRadius: 14, background: "var(--sheet)", boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 0 0 0.5px var(--glass-line)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function RuleBox({ members, adults, ok, note }: { members: number; adults: number; ok: boolean; note?: string }) {
  return (
    <div className="rule">
      <Icon name="shield" size={18} stroke={2} color={ok ? "var(--ok)" : "var(--tint)"} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {members} {members === 1 ? "person" : "people"}, {adults} {adults === 1 ? "adult" : "adults"}
        </span>
        <span style={{ fontSize: 12, color: ok ? "var(--ok)" : "var(--tint)" }}>{note ?? (ok ? "Meets the safeguarding rules" : "Groups need at least 3 people including 2 adults")}</span>
      </div>
    </div>
  );
}
