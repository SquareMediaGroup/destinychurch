"use client";

// Theme controls for a links page: start from a preset, then change anything.
//
// Every change goes straight into the live preview beside it. The preset key
// is kept only as a label ("Started from Sunrise") — once someone edits a
// value, the theme is theirs.

import { labelClass } from "@/components/admin/AdminUI";
import { FieldShell, SelectField, TextField, ToggleField } from "@/components/admin/blocks/fields/BasicFields";
import { ImageField } from "@/components/admin/blocks/fields/ImageField";
import {
  AVATAR_SHAPES,
  BUTTON_RADII,
  BUTTON_STYLES,
  FONT_OPTIONS,
  HOVER_EFFECTS,
  THEME_PRESETS,
  themeToCssVars,
  type FontKey,
  type Theme,
} from "@/lib/linkPages/theme";
import ColorField from "./ColorField";

type Section = "background" | "text" | "button" | "font" | "avatar" | "layout" | "effects";

const BUTTON_STYLE_LABELS: Record<(typeof BUTTON_STYLES)[number], string> = {
  fill: "Solid",
  outline: "Outline",
  soft: "Soft shadow",
  hard: "Hard shadow",
  glass: "Frosted glass",
};
const HOVER_LABELS: Record<(typeof HOVER_EFFECTS)[number], string> = {
  fill: "Fill with accent",
  lift: "Lift",
  grow: "Grow",
  none: "None",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-destiny-grey-800">
      <h3 className="mb-4 text-sm font-black text-destiny-grey dark:text-white">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <span className="text-xs font-bold text-destiny-grey/55 dark:text-white/55">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-destiny-orange"
      />
    </div>
  );
}

/** A miniature of the theme — background, two buttons — for the preset picker. */
function PresetSwatch({ theme }: { theme: Theme }) {
  const vars = themeToCssVars(theme) as React.CSSProperties;
  const radius = theme.button.radius === "pill" ? 999 : theme.button.radius === "square" ? 2 : 6;
  const btn: React.CSSProperties =
    theme.button.style === "outline"
      ? { border: `1.5px solid ${theme.button.bg}`, background: "transparent" }
      : theme.button.style === "glass"
        ? { background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.35)" }
        : theme.button.style === "hard"
          ? { background: theme.button.bg, border: `1.5px solid ${theme.button.shadow}`, boxShadow: `2px 2px 0 ${theme.button.shadow}` }
          : { background: theme.button.bg, boxShadow: "0 3px 8px -4px rgba(0,0,0,.35)" };
  return (
    <div
      className="flex h-24 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl px-4"
      style={{ ...vars, background: theme.background.type === "gradient" ? theme.background.gradient : theme.background.color }}
    >
      <span
        className="mb-0.5 h-5 w-5 rounded-full"
        style={{ background: theme.accent, opacity: 0.9 }}
        aria-hidden="true"
      />
      <span className="block h-3.5 w-full" style={{ ...btn, borderRadius: radius }} />
      <span className="block h-3.5 w-full" style={{ ...btn, borderRadius: radius }} />
    </div>
  );
}

export default function AppearanceTab({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (next: Theme) => void;
}) {
  function patch<S extends Section>(section: S, value: Partial<Theme[S]>) {
    // Any hand edit makes the theme the page's own; the preset stops being
    // highlighted so it doesn't claim a look the page no longer has.
    setTheme({ ...theme, preset: "custom", [section]: { ...theme[section], ...value } });
  }

  const fontOptions = (Object.keys(FONT_OPTIONS) as FontKey[]).map((key) => ({
    value: key,
    label: FONT_OPTIONS[key].label,
  }));

  return (
    <div className="space-y-4">
      <Card title="Start from a theme">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const current = theme.preset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() =>
                  setTheme({
                    ...preset.theme,
                    // Keep an uploaded background/cover when switching looks —
                    // they're content, and losing them would be a nasty surprise.
                    background: {
                      ...preset.theme.background,
                      imageUrl: theme.background.imageUrl || preset.theme.background.imageUrl,
                      videoUrl: theme.background.videoUrl || preset.theme.background.videoUrl,
                    },
                    layout: {
                      ...preset.theme.layout,
                      coverUrl: theme.layout.coverUrl,
                      style: theme.layout.style,
                    },
                  })
                }
                aria-pressed={current}
                className={`rounded-2xl border-2 p-1.5 text-left transition ${
                  current ? "border-destiny-orange" : "border-transparent hover:border-black/10 dark:hover:border-white/15"
                }`}
              >
                <PresetSwatch theme={preset.theme} />
                <span className="mt-1.5 block px-1 text-sm font-bold text-destiny-grey dark:text-white">{preset.label}</span>
                <span className="block px-1 pb-1 text-xs leading-snug text-destiny-grey/50 dark:text-white/50">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Background">
        <SelectField
          label="Type"
          value={theme.background.type}
          options={[
            { value: "solid", label: "Solid colour" },
            { value: "gradient", label: "Gradient" },
            { value: "image", label: "Image" },
            { value: "video", label: "Video (muted, looping)" },
          ]}
          onChange={(v) => patch("background", { type: v as Theme["background"]["type"] })}
        />
        {theme.background.type === "gradient" ? (
          <ColorField
            label="Gradient"
            gradient
            value={theme.background.gradient}
            onChange={(v) => patch("background", { gradient: v })}
          />
        ) : (
          <ColorField
            label={theme.background.type === "solid" ? "Colour" : "Colour behind the image"}
            value={theme.background.color}
            onChange={(v) => patch("background", { color: v })}
          />
        )}
        {(theme.background.type === "image" || theme.background.type === "video") && (
          <ImageField
            label={theme.background.type === "video" ? "Poster image (shown while the video loads)" : "Background image"}
            value={theme.background.imageUrl}
            onChange={(v) => patch("background", { imageUrl: v })}
          />
        )}
        {theme.background.type === "video" && (
          <TextField
            label="Video URL (.mp4)"
            value={theme.background.videoUrl}
            placeholder="https://…/background.mp4"
            help="A short, small MP4 works best. It's hidden for anyone who has asked their device for less motion."
            onChange={(v) => patch("background", { videoUrl: v })}
          />
        )}
        {(theme.background.type === "image" || theme.background.type === "video") && (
          <>
            <Slider
              label="Darken"
              value={theme.background.overlay}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => patch("background", { overlay: v })}
            />
            <Slider
              label="Blur"
              value={theme.background.blur}
              min={0}
              max={20}
              unit="px"
              onChange={(v) => patch("background", { blur: v })}
            />
          </>
        )}
        <ToggleField
          label="Destiny glow"
          help="The soft orange and blue light in the corners."
          value={theme.background.glow}
          onChange={(v) => patch("background", { glow: v })}
        />
      </Card>

      <Card title="Colours">
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorField label="Text" value={theme.text.color} onChange={(v) => patch("text", { color: v })} />
          <ColorField label="Headings" value={theme.text.heading} onChange={(v) => patch("text", { heading: v })} />
          <ColorField
            label="Accent"
            value={theme.accent}
            onChange={(v) => setTheme({ ...theme, preset: "custom", accent: v })}
            help="Icons, badges and hover fills."
          />
        </div>
      </Card>

      <Card title="Buttons">
        <FieldShell label="Style">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {BUTTON_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={theme.button.style === style}
                onClick={() => patch("button", { style })}
                className={`rounded-xl border-2 px-2 py-2.5 text-xs font-bold transition ${
                  theme.button.style === style
                    ? "border-destiny-orange bg-destiny-orange/5 text-destiny-orange"
                    : "border-black/10 text-destiny-grey/60 hover:border-destiny-orange/40 dark:border-white/10 dark:text-white/60"
                }`}
              >
                {BUTTON_STYLE_LABELS[style]}
              </button>
            ))}
          </div>
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Corners"
            value={theme.button.radius}
            options={BUTTON_RADII.map((r) => ({ value: r, label: r === "pill" ? "Pill" : r === "rounded" ? "Rounded" : "Square" }))}
            onChange={(v) => patch("button", { radius: v as Theme["button"]["radius"] })}
          />
          <SelectField
            label="Text align"
            value={theme.button.align}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
            ]}
            onChange={(v) => patch("button", { align: v as Theme["button"]["align"] })}
          />
          <SelectField
            label="On hover"
            value={theme.button.hover}
            options={HOVER_EFFECTS.map((h) => ({ value: h, label: HOVER_LABELS[h] }))}
            onChange={(v) => patch("button", { hover: v as Theme["button"]["hover"] })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorField
            label={theme.button.style === "outline" ? "Outline" : "Button"}
            value={theme.button.bg}
            onChange={(v) => patch("button", { bg: v })}
          />
          <ColorField label="Button text" value={theme.button.text} onChange={(v) => patch("button", { text: v })} />
          <ColorField label="Shadow" value={theme.button.shadow} onChange={(v) => patch("button", { shadow: v })} />
        </div>
      </Card>

      <Card title="Fonts">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Headings"
            value={theme.font.heading}
            options={fontOptions}
            onChange={(v) => patch("font", { heading: v as FontKey })}
          />
          <SelectField
            label="Body text"
            value={theme.font.body}
            options={fontOptions}
            onChange={(v) => patch("font", { body: v as FontKey })}
          />
        </div>
      </Card>

      <Card title="Layout">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Header"
            value={theme.layout.style}
            options={[
              { value: "classic", label: "Classic — photo and name" },
              { value: "hero", label: "Hero — big cover image on top" },
            ]}
            onChange={(v) => patch("layout", { style: v as Theme["layout"]["style"] })}
          />
          <SelectField
            label="Link buttons"
            value={theme.layout.links}
            options={[
              { value: "list", label: "One column" },
              { value: "grid", label: "Two columns on bigger screens" },
            ]}
            onChange={(v) => patch("layout", { links: v as Theme["layout"]["links"] })}
          />
        </div>
        {theme.layout.style === "hero" && (
          <ImageField label="Cover image" value={theme.layout.coverUrl} onChange={(v) => patch("layout", { coverUrl: v })} />
        )}
        <SelectField
          label="Profile photo shape"
          value={theme.avatar.shape}
          options={AVATAR_SHAPES.map((s) => ({ value: s, label: s === "hidden" ? "Don't show" : s[0].toUpperCase() + s.slice(1) }))}
          onChange={(v) => patch("avatar", { shape: v as Theme["avatar"]["shape"] })}
        />
        <ToggleField
          label="Animate in"
          help="Blocks rise in one after another when the page opens. Always off for visitors who ask their device for less motion."
          value={theme.effects.entrance}
          onChange={(v) => patch("effects", { entrance: v })}
        />
      </Card>
    </div>
  );
}
