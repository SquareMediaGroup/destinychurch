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
    <div className="flex h-full flex-col bg-zinc-900 text-zinc-100">
      <div className="border-b border-white/5 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Layers</p>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {layout.length === 0 ? (
          <p className="px-2 py-4 text-[11px] text-white/30">No elements</p>
        ) : (
          <ul className="flex flex-col gap-px">
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
        className={`group relative flex items-center gap-1.5 rounded text-[11px] transition ${
          selected
            ? "bg-destiny-orange/15 text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
      >
        {dropTarget === "before" && (
          <div className="pointer-events-none absolute -top-px left-2 right-2 h-0.5 rounded bg-destiny-orange" />
        )}
        {dropTarget === "after" && (
          <div className="pointer-events-none absolute -bottom-px left-2 right-2 h-0.5 rounded bg-destiny-orange" />
        )}
        <button
          type="button"
          onClick={() => onSelect(element.id)}
          className="flex flex-1 items-center gap-1.5 py-1 pr-1 text-left"
        >
          <span className="material-symbols-rounded text-[13px] opacity-70">
            {meta?.icon || "widgets"}
          </span>
          <span className="font-medium">{meta?.label || element.type}</span>
        </button>
        <div className="flex pr-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onMoveUp(element.id)}
            disabled={isFirst}
            className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:text-white disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-[12px]">arrow_upward</span>
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(element.id)}
            disabled={isLast}
            className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:text-white disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-[12px]">arrow_downward</span>
          </button>
        </div>
      </div>
      {hasChildren && (
        <ul className="flex flex-col gap-px">
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
