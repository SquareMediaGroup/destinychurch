"use client";

import { useEffect, useState, useCallback } from "react";

type Settings = {
  hyperlegible: boolean;
  textSize: "default" | "lg" | "xl";
  spacing: boolean;
  contrast: boolean;
  grayscale: boolean;
  reduceMotion: boolean;
  focus: boolean;
  hideImages: boolean;
};

const DEFAULTS: Settings = {
  hyperlegible: false,
  textSize: "default",
  spacing: false,
  contrast: false,
  grayscale: false,
  reduceMotion: false,
  focus: false,
  hideImages: false,
};

const STORAGE_KEY = "dc-a11y-settings";

function applySettings(s: Settings) {
  const root = document.documentElement;
  root.classList.toggle("a11y-hyperlegible", s.hyperlegible);
  root.classList.toggle("a11y-text-lg", s.textSize === "lg");
  root.classList.toggle("a11y-text-xl", s.textSize === "xl");
  root.classList.toggle("a11y-spacing", s.spacing);
  root.classList.toggle("a11y-contrast", s.contrast);
  root.classList.toggle("a11y-grayscale", s.grayscale);
  root.classList.toggle("a11y-reduce-motion", s.reduceMotion);
  root.classList.toggle("a11y-focus", s.focus);
  root.classList.toggle("a11y-hide-images", s.hideImages);
}

export default function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
        setSettings(parsed);
        applySettings(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      applySettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    applySettings(DEFAULTS);
  }, []);

  if (!hydrated) return null;

  return (
    <div className="a11y-toolbar">
      <button
        type="button"
        aria-label={open ? "Close accessibility menu" : "Open accessibility menu"}
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 left-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-destiny-orange text-white shadow-lg ring-2 ring-white/70 transition hover:bg-destiny-orange-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-destiny-orange/40 sm:bottom-6 sm:left-6 sm:h-14 sm:w-14"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm9 5H3a1 1 0 0 0 0 2h6v3l-2.6 8.2a1 1 0 0 0 1.9.6L11 14h2l2.7 6.8a1 1 0 0 0 1.9-.6L15 12V9h6a1 1 0 0 0 0-2Z" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="a11y-panel"
            role="dialog"
            aria-label="Accessibility settings"
            className="fixed bottom-20 left-4 z-[61] w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:bottom-24 sm:left-6"
          >
            <div className="flex items-center justify-between border-b border-black/5 bg-destiny-grey px-5 py-4 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
                  Accessibility
                </p>
                <h2 className="text-lg font-black">Adjust this site</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close accessibility menu"
                className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <path d="M18.3 5.71 12 12.01l6.3 6.3-1.42 1.42L10.59 13.4l-6.3 6.3-1.41-1.41 6.3-6.3-6.3-6.3 1.41-1.41 6.3 6.3 6.29-6.3 1.42 1.42Z" />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <Section title="Reading">
                <Toggle
                  label="Hyperlegible font"
                  description="Switch to a font designed for low-vision and dyslexic readers."
                  checked={settings.hyperlegible}
                  onChange={(v) => update({ hyperlegible: v })}
                />
                <Toggle
                  label="Increased spacing"
                  description="More space between lines, letters and words."
                  checked={settings.spacing}
                  onChange={(v) => update({ spacing: v })}
                />
                <ChoiceRow
                  label="Text size"
                  value={settings.textSize}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "lg", label: "Large" },
                    { value: "xl", label: "Extra large" },
                  ]}
                  onChange={(v) => update({ textSize: v as Settings["textSize"] })}
                />
              </Section>

              <Section title="Vision">
                <Toggle
                  label="High contrast"
                  description="Black background with high-contrast yellow text."
                  checked={settings.contrast}
                  onChange={(v) => update({ contrast: v })}
                />
                <Toggle
                  label="Desaturate colours"
                  description="Removes colour for users with light sensitivity."
                  checked={settings.grayscale}
                  onChange={(v) => update({ grayscale: v })}
                />
                <Toggle
                  label="Hide images"
                  description="Hide photos for a text-only experience."
                  checked={settings.hideImages}
                  onChange={(v) => update({ hideImages: v })}
                />
              </Section>

              <Section title="Motion & focus">
                <Toggle
                  label="Reduce motion"
                  description="Disables animations and autoplaying video."
                  checked={settings.reduceMotion}
                  onChange={(v) => update({ reduceMotion: v })}
                />
                <Toggle
                  label="Enhanced focus ring"
                  description="Adds a thick orange ring around the focused element."
                  checked={settings.focus}
                  onChange={(v) => update({ focus: v })}
                />
              </Section>

              <button
                type="button"
                onClick={reset}
                className="mt-2 w-full rounded-full border border-destiny-grey/20 px-4 py-2.5 text-sm font-bold text-destiny-grey hover:bg-destiny-grey/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange"
              >
                Reset to defaults
              </button>

              <p className="mt-4 text-xs leading-relaxed text-destiny-grey/60">
                Need text-to-speech, voice control or keyboard remapping? Your
                device already has these built in — search your settings for
                <em> Read Aloud, Voice Control</em> or <em>Keyboard Shortcuts</em>.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border-b border-black/5 pb-3 last:border-b-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-destiny-grey/50">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-black/5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange focus-visible:ring-offset-2 ${
          checked ? "bg-destiny-orange" : "bg-destiny-grey/25"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="flex-1">
        <span className="block text-sm font-bold text-destiny-grey">{label}</span>
        <span className="block text-xs text-destiny-grey/60">{description}</span>
      </span>
    </label>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="p-2">
      <p className="mb-2 text-sm font-bold text-destiny-grey">{label}</p>
      <div className="inline-flex rounded-full bg-destiny-grey/10 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange ${
              value === o.value
                ? "bg-white text-destiny-grey shadow"
                : "text-destiny-grey/60 hover:text-destiny-grey"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
