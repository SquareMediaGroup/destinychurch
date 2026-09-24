"use client";

import { useMemo, useState } from "react";
import { FieldShell, fieldInputClass } from "./BasicFields";
import { ICON_NAMES } from "@/lib/iconNames";

/**
 * A curated starting set, shown before anything is searched. Search covers
 * ICON_NAMES — the only glyphs the subset icon font contains (see
 * scripts/sync-icon-names.mjs). There is deliberately no free-text entry: a
 * name outside that list would render as its literal text on the live site.
 */
const SUGGESTED_ICONS = [
  "church", "menu_book", "volunteer_activism", "diversity_3", "favorite",
  "handshake", "groups", "child_care", "family_restroom", "school",
  "calendar_month", "schedule", "event", "location_on", "directions_car",
  "local_parking", "accessible", "coffee", "restaurant", "music_note",
  "mic", "headphones", "videocam", "photo_camera", "campaign",
  "mail", "call", "chat", "help", "info",
  "check_circle", "star", "lightbulb", "flag", "map",
  "wifi", "lock", "shield", "payments", "card_giftcard",
];

export function IconField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "_");
    return q ? ICON_NAMES.filter((name) => name.includes(q)) : SUGGESTED_ICONS;
  }, [query]);

  return (
    <FieldShell label={label} help={help}>
      <div className="flex items-center gap-2">
        {/* Icons are Material Symbols ligature strings, so the preview is
            literally the value rendered in the icon font. */}
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-[#f5f7fa] text-destiny-grey/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70 lg:h-10 lg:w-10"
        >
          <span className="material-symbols-rounded text-[20px]" aria-hidden="true">
            {value || "add"}
          </span>
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-destiny-grey/70 dark:text-white/70">
          {value ? value.replace(/_/g, " ") : "No icon"}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="min-h-11 shrink-0 rounded-xl px-2 text-xs font-bold text-destiny-grey/50 dark:text-white/50 transition hover:text-destiny-grey dark:hover:text-white lg:min-h-10"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          className="min-h-11 shrink-0 rounded-xl border border-black/10 px-3 text-xs font-bold text-destiny-grey/60 dark:border-white/10 dark:text-white/60 transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 lg:min-h-10 lg:px-2.5"
        >
          {open ? "Close" : "Browse"}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 p-2">
          <input
            className={fieldInputClass}
            value={query}
            placeholder="Search icons, e.g. calendar"
            aria-label="Search icons"
            onChange={(event) => setQuery(event.target.value)}
          />
          {results.length === 0 && (
            <p className="px-1 pt-2 text-xs text-destiny-grey/50 dark:text-white/50">
              No icons match. Ask a developer to add it to the site first.
            </p>
          )}
          <div className="mt-2 grid max-h-64 grid-cols-6 gap-1 overflow-y-auto lg:max-h-52 lg:grid-cols-8">
            {results.map((icon) => (
              <button
                key={icon}
                type="button"
                title={icon}
                onClick={() => {
                  onChange(icon);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex h-11 items-center justify-center rounded-lg transition hover:bg-destiny-orange/10 lg:h-9 ${
                  value === icon ? "bg-destiny-orange/15 text-destiny-orange" : "text-destiny-grey/60 dark:text-white/60"
                }`}
              >
                <span aria-hidden className="material-symbols-rounded text-[19px]">{icon}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </FieldShell>
  );
}
