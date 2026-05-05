"use client";

import type { BuilderElement } from "@/lib/builder/types";
import { getElementMeta } from "@/lib/builder/registry";

type Props = {
  layout: BuilderElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
};

export default function ElementTree({ layout, selectedId, onSelect, onMoveUp, onMoveDown }: Props) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-black/5 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
          Layers
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {layout.length === 0 ? (
          <p className="px-2 py-4 text-xs text-destiny-grey/40">No elements yet</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {layout.map((el, idx) => (
              <TreeItem
                key={el.id}
                element={el}
                selected={selectedId === el.id}
                onSelect={onSelect}
                onMoveUp={() => onMoveUp(el.id)}
                onMoveDown={() => onMoveDown(el.id)}
                isFirst={idx === 0}
                isLast={idx === layout.length - 1}
                depth={0}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TreeItem({
  element,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  depth,
}: {
  element: BuilderElement;
  selected: boolean;
  onSelect: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  depth: number;
}) {
  const meta = getElementMeta(element.type);
  return (
    <li>
      <div
        className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
          selected
            ? "bg-destiny-orange/10 text-destiny-orange"
            : "text-destiny-grey/70 hover:bg-[#f5f7fa]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => onSelect(element.id)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="material-symbols-rounded text-sm">
            {meta?.icon || "widgets"}
          </span>
          <span className="font-bold">{meta?.label || element.type}</span>
        </button>
        <div className="flex opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="flex h-5 w-5 items-center justify-center rounded text-destiny-grey/50 hover:bg-white disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-sm">arrow_upward</span>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="flex h-5 w-5 items-center justify-center rounded text-destiny-grey/50 hover:bg-white disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-sm">arrow_downward</span>
          </button>
        </div>
      </div>
    </li>
  );
}
