"use client";

import { useState } from "react";
import type { BuilderElement } from "@/lib/builder/types";
import { getElementMeta } from "@/lib/builder/registry";

type Props = {
  layout: BuilderElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void;
};

export default function ElementTree({
  layout,
  selectedId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onReorder,
}: Props) {
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
              <TreeNode
                key={el.id}
                element={el}
                selectedId={selectedId}
                onSelect={onSelect}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onReorder={onReorder}
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

type DropTarget = "before" | "after" | null;

function TreeNode({
  element,
  selectedId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onReorder,
  isFirst,
  isLast,
  depth,
}: {
  element: BuilderElement;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void;
  isFirst: boolean;
  isLast: boolean;
  depth: number;
}) {
  const meta = getElementMeta(element.type);
  const selected = selectedId === element.id;
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const hasChildren = (element.children?.length ?? 0) > 0;

  function handleDragStart(e: React.DragEvent) {
    e.stopPropagation();
    e.dataTransfer.setData("application/x-builder-tree-id", element.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("application/x-builder-tree-id")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const middle = rect.top + rect.height / 2;
    setDropTarget(e.clientY < middle ? "before" : "after");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("application/x-builder-tree-id");
    const target = dropTarget;
    setDropTarget(null);
    if (draggedId && target) onReorder(draggedId, element.id, target);
  }

  return (
    <li>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropTarget(null)}
        onDrop={handleDrop}
        className={`group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
          selected
            ? "bg-destiny-orange/10 text-destiny-orange"
            : "text-destiny-grey/70 hover:bg-[#f5f7fa]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {dropTarget === "before" && (
          <div className="pointer-events-none absolute -top-px left-2 right-2 h-0.5 rounded bg-destiny-orange" />
        )}
        {dropTarget === "after" && (
          <div className="pointer-events-none absolute -bottom-px left-2 right-2 h-0.5 rounded bg-destiny-orange" />
        )}
        <span className="material-symbols-rounded cursor-grab text-[14px] text-destiny-grey/30 active:cursor-grabbing">
          drag_indicator
        </span>
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
            onClick={() => onMoveUp(element.id)}
            disabled={isFirst}
            className="flex h-5 w-5 items-center justify-center rounded text-destiny-grey/50 hover:bg-white disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-sm">arrow_upward</span>
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(element.id)}
            disabled={isLast}
            className="flex h-5 w-5 items-center justify-center rounded text-destiny-grey/50 hover:bg-white disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-sm">arrow_downward</span>
          </button>
        </div>
      </div>
      {hasChildren && (
        <ul className="flex flex-col gap-0.5">
          {element.children!.map((child, idx) => (
            <TreeNode
              key={child.id}
              element={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onReorder={onReorder}
              isFirst={idx === 0}
              isLast={idx === element.children!.length - 1}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
