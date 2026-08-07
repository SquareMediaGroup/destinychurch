"use client";

import { useState } from "react";
import { inputClass } from "@/components/admin/hr/HrUI";
import { FieldShell } from "./BasicFields";

/**
 * A curated starting set. The free-text input below stays the escape hatch, so
 * this is a shortcut rather than a limit — any Material Symbols Rounded name
 * works.
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

  return (
    <FieldShell label={label} help={help}>
      <div className="flex items-center gap-2">
        {/* Icons are Material Symbols ligature strings, so the preview is
            literally the value rendered in the icon font. An invalid name shows
            as its own text, which is self-explaining feedback. */}
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-[#f5f7fa] text-destiny-grey/70"
        >
          <span className="material-symbols-rounded text-[20px]">
            {value || "add"}
          </span>
        </span>
        <input
          className={inputClass}
          value={value}
          placeholder="calendar_month"
          onChange={(event) => onChange(event.target.value.trim())}
        />
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          className="shrink-0 rounded-xl border border-black/10 px-2.5 py-2 text-xs font-bold text-destiny-grey/60 transition hover:bg-[#f5f7fa]"
        >
          {open ? "Close" : "Browse"}
        </button>
      </div>

      {open && (
        <div className="mt-2 grid max-h-52 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-black/10 bg-white p-2">
          {SUGGESTED_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              title={icon}
              onClick={() => {
                onChange(icon);
                setOpen(false);
              }}
              className={`flex h-9 items-center justify-center rounded-lg transition hover:bg-destiny-orange/10 ${
                value === icon ? "bg-destiny-orange/15 text-destiny-orange" : "text-destiny-grey/60"
              }`}
            >
              <span className="material-symbols-rounded text-[19px]">{icon}</span>
            </button>
          ))}
        </div>
      )}
    </FieldShell>
  );
}
