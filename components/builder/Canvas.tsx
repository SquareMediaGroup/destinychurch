"use client";

import { useState } from "react";
import type { BuilderElement, ElementType } from "@/lib/builder/types";
import ElementRenderer from "./ElementRenderer";
import InsertMenu from "./InsertMenu";

type Props = {
  layout: BuilderElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDropElement: (type: ElementType) => void;
  onDropInto: (parentId: string, type: ElementType) => void;
  onUpdate?: (id: string, patch: Partial<BuilderElement>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
};

export default function Canvas({
  layout,
  selectedId,
  onSelect,
  onDropElement,
  onDropInto,
  onUpdate,
  onDelete,
  onDuplicate,
}: Props) {
  const [insertOpen, setInsertOpen] = useState<number | null>(null);

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("application/x-builder-element")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-builder-element") as ElementType;
    if (type) {
      onDropElement(type);
    }
  }

  return (
    <div
      className="min-h-full bg-white"
      onClick={() => onSelect(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {layout.length === 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInsertOpen(0);
          }}
          className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-12 text-center transition hover:bg-zinc-50"
        >
          <span className="material-symbols-rounded text-5xl text-zinc-300">add_box</span>
          <p className="text-base font-semibold text-zinc-400">Empty canvas</p>
          <p className="text-sm text-zinc-400">
            Drag a component from the left, or click here to insert
          </p>
          {insertOpen === 0 && (
            <InsertMenu
              onPick={(t) => {
                onDropElement(t);
                setInsertOpen(null);
              }}
              onClose={() => setInsertOpen(null)}
            />
          )}
        </button>
      ) : (
        <div className="flex flex-col">
          <InsertSlot
            isOpen={insertOpen === 0}
            onOpen={() => setInsertOpen(0)}
            onClose={() => setInsertOpen(null)}
            onPick={(t) => {
              onDropElement(t);
              setInsertOpen(null);
            }}
          />
          {layout.map((element, i) => (
            <div key={element.id}>
              <ElementRenderer
                element={element}
                selectedId={selectedId}
                onSelect={onSelect}
                onDropInto={onDropInto}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                editing
              />
              <InsertSlot
                isOpen={insertOpen === i + 1}
                onOpen={() => setInsertOpen(i + 1)}
                onClose={() => setInsertOpen(null)}
                onPick={(t) => {
                  // Insert by appending — for MVP we drop to end of layout
                  onDropElement(t);
                  setInsertOpen(null);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsertSlot({
  isOpen,
  onOpen,
  onClose,
  onPick,
}: {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPick: (t: ElementType) => void;
}) {
  return (
    <div
      className="group relative flex h-3 w-full items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-destiny-orange transition ${isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />
      <button
        type="button"
        onClick={onOpen}
        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destiny-orange text-white shadow-md transition ${
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
        }`}
        title="Insert element"
      >
        <span className="material-symbols-rounded text-[14px]">add</span>
      </button>
      {isOpen && <InsertMenu onPick={onPick} onClose={onClose} />}
    </div>
  );
}
