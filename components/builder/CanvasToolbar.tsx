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
    <div className="flex h-full flex-col bg-zinc-900 text-zinc-100">
      <div className="border-b border-white/5 px-3 py-3">
        <div className="relative">
          <span className="material-symbols-rounded pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-white/30">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Insert…"
            className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-white/30 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {CATEGORIES.map((category) => {
          const items = filtered.filter((m) => m.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category} className="mb-3">
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {category}
              </p>
              <div className="grid grid-cols-2 gap-1">
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
      className="group flex flex-col items-start gap-1 rounded-md border border-white/5 bg-white/[0.02] p-2 text-left transition hover:border-white/10 hover:bg-white/[0.06] active:scale-[0.97]"
    >
      <span className="material-symbols-rounded text-[16px] text-white/50 group-hover:text-white/80">
        {meta.icon}
      </span>
      <span className="text-[10.5px] font-medium leading-tight text-white/80">
        {meta.label}
      </span>
    </button>
  );
}
