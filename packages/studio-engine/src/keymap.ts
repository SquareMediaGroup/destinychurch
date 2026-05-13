"use client";

import { useEffect } from "react";
import { useStudio } from "./store";
import type { Tool } from "./store";

type KeyBinding = {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  when?: () => boolean;
};

function matchBinding(e: KeyboardEvent, b: KeyBinding): boolean {
  if (e.key.toLowerCase() !== b.key.toLowerCase()) return false;
  if (b.meta && !(e.metaKey || e.ctrlKey)) return false;
  if (!b.meta && (e.metaKey || e.ctrlKey)) return false;
  if (b.shift && !e.shiftKey) return false;
  if (b.alt && !e.altKey) return false;
  return true;
}

export function useKeymap() {
  useEffect(() => {
    const store = useStudio.getState;

    const isEditing = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if ((el as HTMLElement).contentEditable === "true") return true;
      return store().editingId !== null;
    };

    const bindings: KeyBinding[] = [
      // Tools
      { key: "v", action: () => useStudio.setState({ tool: "select" as Tool }) },
      { key: "h", action: () => useStudio.setState({ tool: "hand" as Tool }) },
      { key: "f", action: () => useStudio.setState({ tool: "frame" as Tool }) },
      { key: "t", action: () => useStudio.setState({ tool: "text" as Tool }) },

      // Selection
      { key: "a", meta: true, action: () => store().selectAll() },
      { key: "Escape", action: () => store().clearSelection() },

      // Delete
      { key: "Backspace", action: () => store().deleteNodes(store().selectedIds), when: () => !isEditing() },
      { key: "Delete", action: () => store().deleteNodes(store().selectedIds), when: () => !isEditing() },

      // Duplicate
      { key: "d", meta: true, action: () => {
        const newIds = store().duplicateNodes(store().selectedIds);
        useStudio.setState({ selectedIds: newIds });
      }},

      // History
      { key: "z", meta: true, action: () => store().undo() },
      { key: "z", meta: true, shift: true, action: () => store().redo() },

      // Zoom
      { key: "=", meta: true, action: () => store().setZoom(store().zoom + 0.1) },
      { key: "-", meta: true, action: () => store().setZoom(store().zoom - 0.1) },
      { key: "0", meta: true, action: () => store().zoomToFit() },
      { key: "1", meta: true, action: () => store().setZoom(1) },

      // View
      { key: "'", meta: true, action: () => store().toggleGrid() },
    ];

    function handler(e: KeyboardEvent) {
      if (isEditing() && !e.metaKey && !e.ctrlKey) return;

      for (const b of bindings) {
        if (matchBinding(e, b)) {
          if (b.when && !b.when()) continue;
          e.preventDefault();
          b.action();
          return;
        }
      }

      // Arrow key nudge for selected nodes
      if (!isEditing() && store().selectedIds.length > 0) {
        const delta = e.shiftKey ? 10 : 1;
        const ids = store().selectedIds;
        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -delta;
        if (e.key === "ArrowDown") dy = delta;
        if (e.key === "ArrowLeft") dx = -delta;
        if (e.key === "ArrowRight") dx = delta;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          store().transact((nodes) => {
            for (const id of ids) {
              const node = nodes[id];
              if (!node) continue;
              if (node.layout.x !== undefined) node.layout.x += dx;
              if (node.layout.y !== undefined) node.layout.y += dy;
            }
          }, { coalesceKey: "nudge", label: "Nudge" });
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
