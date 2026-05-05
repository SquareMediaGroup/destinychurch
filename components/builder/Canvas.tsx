"use client";

import type { BuilderElement, ElementType } from "@/lib/builder/types";
import ElementRenderer from "./ElementRenderer";

type Props = {
  layout: BuilderElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDropElement: (type: ElementType) => void;
};

export default function Canvas({ layout, selectedId, onSelect, onDropElement }: Props) {
  function handleDragOver(e: React.DragEvent) {
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
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="material-symbols-rounded text-5xl text-destiny-grey/20">
            add_box
          </span>
          <p className="text-base font-bold text-destiny-grey/40">Empty canvas</p>
          <p className="text-sm text-destiny-grey/40">
            Drag a component from the left panel to get started
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {layout.map((element) => (
            <ElementRenderer
              key={element.id}
              element={element}
              selectedId={selectedId}
              onSelect={onSelect}
              editing
            />
          ))}
        </div>
      )}
    </div>
  );
}
