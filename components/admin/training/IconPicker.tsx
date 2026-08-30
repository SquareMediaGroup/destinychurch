"use client";

import { labelClass } from "@/components/admin/AdminUI";

// Curated set of Material Symbols that suit church serving teams.
const ICONS = [
  "graphic_eq",
  "mic",
  "volume_up",
  "headphones",
  "speaker",
  "music_note",
  "queue_music",
  "piano",
  "videocam",
  "movie",
  "photo_camera",
  "lightbulb",
  "cast",
  "slideshow",
  "computer",
  "dvr",
  "podcasts",
  "stadia_controller",
  "verified_user",
  "security",
  "badge",
  "groups",
  "diversity_3",
  "handshake",
  "volunteer_activism",
  "emoji_people",
  "support_agent",
  "coffee",
  "local_cafe",
  "restaurant",
  "kitchen",
  "child_care",
  "child_friendly",
  "school",
  "menu_book",
  "auto_stories",
  "church",
  "favorite",
  "star",
  "flag",
  "build",
  "construction",
  "cleaning_services",
  "directions_car",
  "event",
  "calendar_month",
  "celebration",
  "self_improvement",
];

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>Icon</label>
      <div className="grid max-h-44 grid-cols-8 gap-1.5 overflow-auto rounded-xl border border-black/10 bg-[#f9fafb] p-2">
        {ICONS.map((name) => {
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              title={name}
              aria-pressed={active}
              onClick={() => onChange(active ? "" : name)}
              className={`flex h-9 items-center justify-center rounded-lg transition ${
                active
                  ? "bg-destiny-orange text-white"
                  : "text-destiny-grey/60 dark:text-white/60 hover:bg-black/5"
              }`}
            >
              <span className="material-symbols-rounded text-[20px]">{name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-destiny-grey/45 dark:text-white/45">
        Shown next to the category on the public page. Tap an icon to select, tap
        again to clear.
      </p>
    </div>
  );
}
