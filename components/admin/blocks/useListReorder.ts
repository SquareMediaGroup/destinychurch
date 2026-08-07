"use client";

import { useRef } from "react";

/** Distinct from BLOCK_DRAG_MIME so a row dropped on the canvas isn't
 *  mistaken for a palette tile by the editor's handleDrop. */
export const REPEATER_DRAG_MIME = "application/x-dc-repeater-row";

/**
 * HTML5 drag-to-reorder for an in-memory list.
 *
 * Same structure as `components/admin/training/useReorder.ts` — deliberately,
 * so there is one drag idiom in this codebase — but with the persistence
 * stripped out: repeater rows live in an unsaved draft, not behind an endpoint.
 *
 * As there, the live order is mirrored into a ref updated synchronously on each
 * dragenter, so the final order never races React's async state flush, and the
 * `from === null` guard stops an external change clobbering an in-flight drag.
 *
 * HTML5 drag has no touch or keyboard support, so `move()` is exported for the
 * up/down buttons that make reordering possible at all on a tablet.
 */
export function useListReorder<T>(
  items: T[],
  onChange: (next: T[]) => void,
) {
  const from = useRef<number | null>(null);
  const order = useRef<T[]>(items);

  // Note: useReorder mirrors `items` into `order` during render to survive an
  // external reload mid-drag. That isn't needed here — a repeater's list is a
  // local draft, and handleDragStart below always re-seeds — and writing a ref
  // during render is a React Compiler violation, so it's deliberately absent.

  function handleDragStart(index: number, event: React.DragEvent) {
    from.current = index;
    order.current = [...items];
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(REPEATER_DRAG_MIME, String(index));
    // Firefox refuses to start a drag without some standard-type payload.
    event.dataTransfer.setData("text/plain", "");
  }

  function handleDragEnter(index: number) {
    const start = from.current;
    if (start === null || start === index) return;
    const next = [...order.current];
    const [moved] = next.splice(start, 1);
    next.splice(index, 0, moved);
    order.current = next;
    onChange(next);
    from.current = index;
  }

  function handleDragEnd() {
    if (from.current === null) return;
    from.current = null;
    onChange(order.current);
  }

  /** Keyboard and touch reorder path. */
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    order.current = next;
    onChange(next);
  }

  /** Spread onto the row element. The grip itself carries `draggable`. */
  function rowProps(index: number) {
    return {
      onDragStart: (event: React.DragEvent) => handleDragStart(index, event),
      onDragEnter: () => handleDragEnter(index),
      onDragOver: (event: React.DragEvent) => event.preventDefault(),
      onDragEnd: handleDragEnd,
    };
  }

  return { rowProps, move };
}
