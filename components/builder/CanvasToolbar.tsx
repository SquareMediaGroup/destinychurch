"use client";

import { useState } from "react";
import { ELEMENT_REGISTRY, CATEGORIES, type ElementMeta } from "@/lib/builder/registry";
import type { ElementType } from "@/lib/builder/types";

type Props = {
  onAddElement: (type: ElementType) => void;
};

export default function CanvasToolbar({ onAddElement }: Props) {
  const [search, setSearch] = useState("");

  const filtered = ELEMENT_REGISTRY.filter((m) =>
    search ? m.label.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-black/5 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
          Components
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="mt-2 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {CATEGORIES.map((category) => {
          const items = filtered.filter((m) => m.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category} className="mb-4">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
                {category}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {items.map((meta) => (
                  <PaletteItem key={meta.type} meta={meta} onAdd={onAddElement} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaletteItem({ meta, onAdd }: { meta: ElementMeta; onAdd: (t: ElementType) => void }) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/x-builder-element", meta.type);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(meta.type)}
      title={meta.description}
      className="flex flex-col items-start gap-1 rounded-lg border border-black/8 bg-white p-2.5 text-left transition hover:border-destiny-orange/40 hover:bg-destiny-orange/[0.03] active:scale-[0.98]"
    >
      <span className="material-symbols-rounded text-lg text-destiny-grey/60">
        {meta.icon}
      </span>
      <span className="text-[11px] font-bold leading-tight text-destiny-grey">
        {meta.label}
      </span>
    </button>
  );
}
