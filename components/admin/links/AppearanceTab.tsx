"use client";

// Theme controls for a links page: start from a preset, then change anything.
//
// Grouped into collapsible sections (the Theme section starts open) so the tab
// reads as a short list of areas rather than one long form, each showing its
// current value while closed. Short choices use segmented pickers; dropdowns
// are kept for longer lists (fonts). Every change goes straight to the live
// preview. The preset key is only a label — the first hand edit marks the
// theme "custom", and picking a theme again starts over from it.

import { SelectField, TextField, ToggleField } from "@/components/admin/blocks/fields/BasicFields";
import { ImageField } from "@/components/admin/blocks/fields/ImageField";
import {
  BUTTON_STYLES,
  FONT_OPTIONS,
  HOVER_EFFECTS,
  THEME_PRESETS,
  themeToCssVars,
  type FontKey,
  type Theme,
} from "@/lib/linkPages/theme";
import ColorField from "./ColorField";
import { Section, Segmented, Slider } from "./controls";

type Group = "background" | "text" | "button" | "font" | "avatar" | "layout" | "effects" | "profile" | "socials";

const BUTTON_STYLE_LABELS: Record<(typeof BUTTON_STYLES)[number], string> = {
  fill: "Solid",
  outline: "Outline",
  soft: "Soft shadow",
  hard: "Hard shadow",
  glass: "Frosted",
};
const HOVER_LABELS: Record<(typeof HOVER_EFFECTS)[number], string> = {
  fill: "Fill",
  lift: "Lift",
  grow: "Grow",
  none: "None",
};

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
      className="flex h-20 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl px-4"
      style={{ ...vars, background: theme.background.type === "gradient" ? theme.background.gradient : theme.background.color }}
    >
      <span className="mb-0.5 h-4 w-4 rounded-full" style={{ background: theme.accent, opacity: 0.9 }} aria-hidden="true" />
      <span className="block h-3 w-full" style={{ ...btn, borderRadius: radius }} />
      <span className="block h-3 w-full" style={{ ...btn, borderRadius: radius }} />
    </div>
  );
}

export default function AppearanceTab({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (next: Theme | ((prev: Theme) => Theme)) => void;
}) {
  function patch<S extends Group>(group: S, value: Partial<Theme[S]>) {
    // Any hand edit makes the theme the page's own; the preset stops being
    // highlighted so it doesn't claim a look the page no longer has.
    setTheme((prev) => ({ ...prev, preset: "custom", [group]: { ...prev[group], ...value } }));
  }

  /** Switch look, keeping uploaded images — they're content, not style. */
  function applyPreset(key: string) {
    const preset = THEME_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setTheme({
      ...preset.theme,
      background: {
        ...preset.theme.background,
        imageUrl: theme.background.imageUrl || preset.theme.background.imageUrl,
        videoUrl: theme.background.videoUrl || preset.theme.background.videoUrl,
      },
      layout: { ...preset.theme.layout, coverUrl: theme.layout.coverUrl, style: theme.layout.style },
    });
  }

  const fontOptions = (Object.keys(FONT_OPTIONS) as FontKey[]).map((key) => ({
    value: key,
    label: FONT_OPTIONS[key].label,
  }));
  const current = THEME_PRESETS.find((p) => p.key === theme.preset);
  const bg = theme.background;
  const btn = theme.button;

  return (
    <div className="space-y-3">
      <Section
        title="Theme"
        icon="palette"
        summary={current ? current.label : "Custom"}
        defaultOpen
      >
        <div className="grid grid-cols-2 gap-2 @md:grid-cols-3 @3xl:grid-cols-4">
          {THEME_PRESETS.map((preset) => {
            const selected = theme.preset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset.key)}
                aria-pressed={selected}
                title={preset.description}
                className={`rounded-2xl border-2 p-1.5 text-left transition ${
                  selected ? "border-destiny-orange" : "border-transparent hover:border-black/10 dark:hover:border-white/15"
                }`}
              >
                <PresetSwatch theme={preset.theme} />
                <span className="mt-1.5 block truncate px-1 pb-0.5 text-xs font-bold text-destiny-grey dark:text-white">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
        {theme.preset === "custom" && (
          <p className="text-xs text-destiny-grey/50 dark:text-white/50">
            You&apos;ve customised this theme. Pick a theme above to start again from it — your images are kept.
          </p>
        )}
      </Section>

      <Section
        title="Background"
        icon="wallpaper"
        summary={`${bg.type[0].toUpperCase()}${bg.type.slice(1)}${bg.pattern !== "none" ? ` · ${bg.pattern}` : ""}`}
      >
        <Segmented
          label="Type"
          value={bg.type}
          options={[
            { value: "solid", label: "Colour" },
            { value: "gradient", label: "Gradient" },
            { value: "image", label: "Image" },
            { value: "video", label: "Video" },
          ]}
          onChange={(v) => patch("background", { type: v })}
        />
        {bg.type === "gradient" ? (
          <ColorField label="Gradient" gradient value={bg.gradient} onChange={(v) => patch("background", { gradient: v })} />
        ) : (
          <ColorField
            label={bg.type === "solid" ? "Colour" : "Colour behind the image"}
            value={bg.color}
            onChange={(v) => patch("background", { color: v })}
          />
        )}
        {(bg.type === "image" || bg.type === "video") && (
          <>
            <ImageField
              label={bg.type === "video" ? "Poster image (shown while the video loads)" : "Background image"}
              value={bg.imageUrl}
              onChange={(v) => patch("background", { imageUrl: v })}
            />
            {bg.type === "video" && (
              <TextField
                label="Video URL (.mp4)"
                value={bg.videoUrl}
                placeholder="https://…/background.mp4"
                help="A short, small MP4 works best. It's hidden for anyone who has asked their device for less motion."
                onChange={(v) => patch("background", { videoUrl: v })}
              />
            )}
            <div className="grid gap-4 @md:grid-cols-2">
              <Slider label="Darken" value={bg.overlay} min={0} max={90} unit="%" onChange={(v) => patch("background", { overlay: v })} />
              <Slider label="Blur" value={bg.blur} min={0} max={20} unit="px" onChange={(v) => patch("background", { blur: v })} />
            </div>
          </>
        )}
        <Segmented
          label="Pattern"
          value={bg.pattern}
          options={[
            { value: "none", label: "None" },
            { value: "dots", label: "Dots" },
            { value: "grid", label: "Grid" },
            { value: "lines", label: "Lines" },
          ]}
          onChange={(v) => patch("background", { pattern: v })}
        />
        {bg.pattern !== "none" && (
          <Slider
            label="Pattern strength"
            value={bg.patternOpacity}
            min={2}
            max={30}
            unit="%"
            onChange={(v) => patch("background", { patternOpacity: v })}
          />
        )}
        <ToggleField
          label="Destiny glow"
          help="The soft orange and blue light in the corners."
          value={bg.glow}
          onChange={(v) => patch("background", { glow: v })}
        />
      </Section>

      <Section title="Colours" icon="format_color_fill" summary="Text, headings and accent">
        <div className="grid gap-4 @xl:grid-cols-3">
          <ColorField label="Text" value={theme.text.color} onChange={(v) => patch("text", { color: v })} />
          <ColorField label="Headings" value={theme.text.heading} onChange={(v) => patch("text", { heading: v })} />
          <ColorField
            label="Accent"
            value={theme.accent}
            onChange={(v) => setTheme((prev) => ({ ...prev, preset: "custom", accent: v }))}
            help="Icons, badges and the hover fill."
          />
        </div>
      </Section>

      <Section
        title="Buttons"
        icon="smart_button"
        summary={`${BUTTON_STYLE_LABELS[btn.style]} · ${btn.radius === "custom" ? `${btn.radiusPx}px` : btn.radius} · ${btn.size}`}
      >
        <Segmented
          label="Style"
          value={btn.style}
          options={BUTTON_STYLES.map((s) => ({ value: s, label: BUTTON_STYLE_LABELS[s] }))}
          onChange={(v) => patch("button", { style: v })}
        />
        <div className="grid gap-4 @xl:grid-cols-3">
          <ColorField label={btn.style === "outline" ? "Outline" : "Button"} value={btn.bg} onChange={(v) => patch("button", { bg: v })} />
          <ColorField label="Button text" value={btn.text} onChange={(v) => patch("button", { text: v })} />
          <ColorField label="Shadow" value={btn.shadow} onChange={(v) => patch("button", { shadow: v })} />
        </div>
        <Segmented
          label="Corners"
          value={btn.radius}
          options={[
            { value: "square", label: "Square" },
            { value: "rounded", label: "Rounded" },
            { value: "pill", label: "Pill" },
            { value: "custom", label: "Custom" },
          ]}
          onChange={(v) => patch("button", { radius: v })}
        />
        {btn.radius === "custom" && (
          <Slider label="Corner radius" value={btn.radiusPx} min={0} max={40} unit="px" onChange={(v) => patch("button", { radiusPx: v })} />
        )}
        <div className="grid gap-4 @xl:grid-cols-2">
          <Segmented
            label="Size"
            value={btn.size}
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "large", label: "Large" },
            ]}
            onChange={(v) => patch("button", { size: v })}
          />
          <Segmented
            label="Space between"
            value={btn.spacing}
            options={[
              { value: "tight", label: "Tight" },
              { value: "normal", label: "Normal" },
              { value: "loose", label: "Loose" },
            ]}
            onChange={(v) => patch("button", { spacing: v })}
          />
        </div>
        <div className="grid gap-4 @xl:grid-cols-2">
          <Segmented
            label="Text align"
            value={btn.align}
            options={[
              { value: "left", label: "Left", icon: "format_align_left" },
              { value: "center", label: "Centre", icon: "format_align_center" },
            ]}
            onChange={(v) => patch("button", { align: v })}
          />
          <Segmented
            label="On hover"
            value={btn.hover}
            options={HOVER_EFFECTS.map((h) => ({ value: h, label: HOVER_LABELS[h] }))}
            onChange={(v) => patch("button", { hover: v })}
          />
        </div>
        {btn.style !== "soft" && btn.style !== "glass" && (
          <Slider label="Border" value={btn.borderWidth} min={0} max={4} unit="px" onChange={(v) => patch("button", { borderWidth: v })} />
        )}
        <div className="grid gap-2 @xl:grid-cols-2">
          <ToggleField label="Show icons" value={btn.showIcons} onChange={(v) => patch("button", { showIcons: v })} />
          <ToggleField label="Show arrows" value={btn.showArrows} onChange={(v) => patch("button", { showArrows: v })} />
        </div>
      </Section>

      <Section
        title="Header"
        icon="account_circle"
        summary={`${theme.profile.align === "left" ? "Left" : "Centred"} · ${theme.layout.style === "hero" ? "cover image" : "classic"}`}
      >
        <div className="grid gap-4 @xl:grid-cols-2">
          <Segmented
            label="Layout"
            value={theme.layout.style}
            options={[
              { value: "classic", label: "Classic" },
              { value: "hero", label: "Cover image" },
            ]}
            onChange={(v) => patch("layout", { style: v })}
          />
          <Segmented
            label="Align"
            value={theme.profile.align}
            options={[
              { value: "center", label: "Centre", icon: "format_align_center" },
              { value: "left", label: "Left", icon: "format_align_left" },
            ]}
            onChange={(v) => patch("profile", { align: v })}
          />
        </div>
        {theme.layout.style === "hero" && (
          <ImageField label="Cover image" value={theme.layout.coverUrl} onChange={(v) => patch("layout", { coverUrl: v })} />
        )}
        <Segmented
          label="Heading size"
          value={theme.profile.titleSize}
          options={[
            { value: "sm", label: "S" },
            { value: "md", label: "M" },
            { value: "lg", label: "L" },
            { value: "xl", label: "XL" },
          ]}
          onChange={(v) => patch("profile", { titleSize: v })}
        />
        <div className="grid gap-4 @xl:grid-cols-2">
          <Segmented
            label="Photo"
            value={theme.avatar.shape}
            options={[
              { value: "circle", label: "Circle" },
              { value: "rounded", label: "Rounded" },
              { value: "square", label: "Square" },
              { value: "hidden", label: "Hide" },
            ]}
            onChange={(v) => patch("avatar", { shape: v })}
          />
          {theme.avatar.shape !== "hidden" && (
            <Segmented
              label="Photo size"
              value={theme.avatar.size}
              options={[
                { value: "sm", label: "S" },
                { value: "md", label: "M" },
                { value: "lg", label: "L" },
              ]}
              onChange={(v) => patch("avatar", { size: v })}
            />
          )}
        </div>
        <div className="grid gap-2 @xl:grid-cols-2">
          <ToggleField label="Uppercase heading" value={theme.profile.uppercase} onChange={(v) => patch("profile", { uppercase: v })} />
          {theme.avatar.shape !== "hidden" && (
            <ToggleField label="Accent ring on photo" value={theme.avatar.ring} onChange={(v) => patch("avatar", { ring: v })} />
          )}
          <ToggleField
            label="Accent line"
            help="Shown under the header when there's no photo or social icons."
            value={theme.profile.showRule}
            onChange={(v) => patch("profile", { showRule: v })}
          />
        </div>
      </Section>

      <Section title="Fonts" icon="text_fields" summary={`${FONT_OPTIONS[theme.font.heading].label} / ${FONT_OPTIONS[theme.font.body].label}`}>
        <div className="grid gap-4 @md:grid-cols-2">
          <SelectField label="Headings" value={theme.font.heading} options={fontOptions} onChange={(v) => patch("font", { heading: v as FontKey })} />
          <SelectField label="Body text" value={theme.font.body} options={fontOptions} onChange={(v) => patch("font", { body: v as FontKey })} />
        </div>
      </Section>

      <Section title="Social icons" icon="share" summary={`${theme.socials.style} · ${theme.socials.size}`}>
        <div className="grid gap-4 @xl:grid-cols-2">
          <Segmented
            label="Style"
            value={theme.socials.style}
            options={[
              { value: "plain", label: "Plain" },
              { value: "filled", label: "Filled" },
              { value: "outline", label: "Outline" },
            ]}
            onChange={(v) => patch("socials", { style: v })}
          />
          <Segmented
            label="Size"
            value={theme.socials.size}
            options={[
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
            ]}
            onChange={(v) => patch("socials", { size: v })}
          />
        </div>
        <p className="text-xs text-destiny-grey/45 dark:text-white/45">Add or reorder the icons themselves in the Profile tab.</p>
      </Section>

      <Section
        title="Layout and motion"
        icon="dashboard"
        summary={`${theme.layout.width} width · ${theme.layout.links === "grid" ? "two columns" : "one column"}`}
      >
        <div className="grid gap-4 @xl:grid-cols-2">
          <Segmented
            label="Page width"
            value={theme.layout.width}
            options={[
              { value: "narrow", label: "Narrow" },
              { value: "normal", label: "Normal" },
              { value: "wide", label: "Wide" },
            ]}
            onChange={(v) => patch("layout", { width: v })}
          />
          <Segmented
            label="Link buttons"
            value={theme.layout.links}
            options={[
              { value: "list", label: "One column" },
              { value: "grid", label: "Two columns" },
            ]}
            onChange={(v) => patch("layout", { links: v })}
            help="Two columns applies from tablet width up."
          />
        </div>
        <div className="grid gap-2 @xl:grid-cols-2">
          <ToggleField
            label="Animate in"
            help="Blocks rise in when the page opens. Always off for visitors who prefer less motion."
            value={theme.effects.entrance}
            onChange={(v) => patch("effects", { entrance: v })}
          />
          <ToggleField
            label="Site footer"
            help="“Visit the full website” at the bottom of the page."
            value={theme.layout.showFooter}
            onChange={(v) => patch("layout", { showFooter: v })}
          />
        </div>
      </Section>
    </div>
  );
}
