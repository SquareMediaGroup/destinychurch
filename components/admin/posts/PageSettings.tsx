"use client";

import { DESCRIPTION_LIMIT, HERO_STYLES, type HeroStyle, type PostFields } from "@/lib/posts";
import { ImageField } from "@/components/admin/blocks/fields/ImageField";
import {
  FieldShell,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/blocks/fields/BasicFields";

/** A tiny picture of each hero style, so the choice reads at a glance. */
function HeroThumb({ style }: { style: HeroStyle }) {
  const lines = (
    <div className="space-y-1 px-2 pb-2 pt-1.5">
      <div className="h-1 w-4/5 rounded bg-black/10" />
      <div className="h-1 w-3/5 rounded bg-black/10" />
    </div>
  );
  if (style === "image") {
    return (
      <>
        <div className="flex h-7 items-end bg-gradient-to-br from-destiny-grey/70 to-destiny-grey px-2 pb-1">
          <div className="h-1.5 w-2/3 rounded bg-white" />
        </div>
        {lines}
      </>
    );
  }
  if (style === "banner") {
    return (
      <>
        <div className="flex h-7 items-center bg-destiny-orange px-2">
          <div className="h-1.5 w-2/3 rounded bg-white" />
        </div>
        {lines}
      </>
    );
  }
  return (
    <>
      <div className="px-2 pt-2">
        <div className="h-1.5 w-2/3 rounded bg-destiny-grey/70" />
      </div>
      {lines}
    </>
  );
}

export function HeroStylePicker({
  value,
  onChange,
}: {
  value: HeroStyle;
  onChange: (next: HeroStyle) => void;
}) {
  return (
    <FieldShell label="Page header" help={HERO_STYLES.find((s) => s.value === value)?.help}>
      <div role="radiogroup" aria-label="Page header" className="grid grid-cols-3 gap-2">
        {HERO_STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={value === s.value}
            onClick={() => onChange(s.value)}
            className={`overflow-hidden rounded-lg border text-left transition ${
              value === s.value
                ? "border-destiny-orange ring-2 ring-destiny-orange/20"
                : "border-black/10 hover:border-black/25 dark:border-white/10"
            }`}
          >
            <div className="bg-white">
              <HeroThumb style={s.value} />
            </div>
            <span className="block border-t border-black/5 px-2 py-1 text-[11px] font-bold text-destiny-grey dark:text-white">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

/**
 * Page-level settings: how the page opens, what it says when shared, and
 * whether the promo rails show. Used in the desktop sidebar and the mobile
 * sheet; `urlAndStatus` is the slug + published controls, which each layout
 * places itself.
 */
export function PageSettings({
  form,
  set,
  urlAndStatus,
}: {
  form: PostFields;
  set: <K extends keyof PostFields>(key: K, value: PostFields[K]) => void;
  urlAndStatus?: React.ReactNode;
}) {
  const description = form.description ?? "";
  return (
    <div className="flex flex-col gap-5">
      {urlAndStatus}

      <HeroStylePicker value={form.hero_style} onChange={(v) => set("hero_style", v)} />

      {form.hero_style === "image" && (
        <ImageField
          label="Header image"
          help="A wide photo works best — at least 1600px across."
          value={form.hero_image_url ?? ""}
          onChange={(url) => set("hero_image_url", url || null)}
        />
      )}

      <TextField
        label="Subtitle"
        help="Optional line under the title."
        value={form.subtitle ?? ""}
        maxLength={160}
        onChange={(v) => set("subtitle", v)}
      />

      <div>
        <TextAreaField
          label="Description"
          help="Shown by Google and when the link is shared."
          value={description}
          rows={3}
          maxLength={DESCRIPTION_LIMIT * 2}
          onChange={(v) => set("description", v)}
        />
        <p
          className={`mt-1 text-right text-[11px] font-medium ${
            description.length > DESCRIPTION_LIMIT ? "text-destiny-red" : "text-destiny-grey/40 dark:text-white/40"
          }`}
        >
          {description.length}/{DESCRIPTION_LIMIT}
        </p>
      </div>

      <ImageField
        label="Share image"
        help={
          form.hero_style === "image"
            ? "Leave empty to use the header image."
            : "Shown when the link is shared on social media or in messages."
        }
        value={form.og_image_url ?? ""}
        onChange={(url) => set("og_image_url", url || null)}
      />

      <ToggleField
        label="Show promo sidebars"
        help="Upcoming events and courses beside the page on wide screens."
        value={form.show_rails}
        onChange={(v) => set("show_rails", v)}
      />
    </div>
  );
}
