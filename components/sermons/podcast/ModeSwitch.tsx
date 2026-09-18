"use client";

// Extracted from FeaturedSermon.tsx so the sermon detail page can offer the
// same Watch/Listen switch when a confident video↔episode pairing exists.

export default function ModeSwitch({
  mode,
  onChange,
}: {
  mode: "watch" | "listen";
  onChange: (next: "watch" | "listen") => void;
}) {
  const options: { value: "watch" | "listen"; label: string; icon: string }[] = [
    { value: "watch", label: "Watch", icon: "play_circle" },
    { value: "listen", label: "Listen", icon: "headphones" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Choose video or audio"
      className="inline-flex shrink-0 self-start rounded-full border border-black/[0.07] bg-[#f5f7fa] p-1 sm:self-auto"
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        onChange(mode === "watch" ? "listen" : "watch");
      }}
    >
      {options.map((opt) => {
        const selected = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition ${
              selected
                ? "bg-destiny-orange text-white shadow-sm shadow-destiny-orange/25"
                : "text-muted hover:text-destiny-grey"
            }`}
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">{opt.icon}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
