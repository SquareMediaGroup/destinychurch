"use client";

import { useEffect, useRef, useState } from "react";
import { ELEMENT_REGISTRY, CATEGORIES } from "@/lib/builder/registry";
import type { ElementType } from "@/lib/builder/types";

type Props = {
  onPick: (type: ElementType) => void;
  onClose: () => void;
};

export default function InsertMenu({ onPick, onClose }: Props) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const filtered = ELEMENT_REGISTRY.filter((m) =>
    search ? m.label.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-1/2 top-full z-50 mt-1 w-72 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-2xl"
    >
      <div className="relative mb-2">
        <span className="material-symbols-rounded pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-white/30">
          search
        </span>
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Insert element…"
          className="w-full rounded-md bg-white/5 py-1.5 pl-7 pr-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {CATEGORIES.map((cat) => {
          const items = filtered.filter((m) => m.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="mb-2">
              <p className="px-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">
                {cat}
              </p>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {items.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => onPick(m.type)}
                    className="flex flex-col items-center gap-0.5 rounded p-1.5 text-center hover:bg-white/10"
                    title={m.description}
                  >
                    <span className="material-symbols-rounded text-[16px] text-white/60">
                      {m.icon}
                    </span>
                    <span className="line-clamp-1 text-[9.5px] text-white/70">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
