"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";

// Native HTML5 drag-to-reorder for a list of rows. Rows reorder live as you
// drag; the new order is persisted (sort_order = index) when the drag ends.
// No external dependency.
//
// The live order is mirrored into a ref that updates synchronously on each
// dragenter, so persistence at dragend never races React's async state flush.
export function useReorder<T extends { id: string; sort_order: number }>(
  items: T[],
  setItems: Dispatch<SetStateAction<T[]>>,
  endpoint: (id: string) => string,
  onError?: (msg: string) => void,
) {
  const from = useRef<number | null>(null);
  const order = useRef<T[]>(items);
  // Snapshot of the order before the current drag started, kept so a failed
  // persist can revert the optimistic update instead of leaving it applied.
  const preDragOrder = useRef<T[] | null>(null);
  // Track external changes (load/reload) but never clobber an in-flight drag.
  if (from.current === null) order.current = items;

  function handleDragStart(index: number, e: React.DragEvent) {
    from.current = index;
    order.current = [...items];
    preDragOrder.current = [...items];
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox to initiate the drag.
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragEnter(index: number) {
    const f = from.current;
    if (f === null || f === index) return;
    const next = [...order.current];
    const [moved] = next.splice(f, 1);
    next.splice(index, 0, moved);
    order.current = next;
    setItems(next);
    from.current = index;
  }

  async function handleDragEnd() {
    if (from.current === null) return;
    from.current = null;

    const current = order.current;
    const changed = current
      .map((item, index) => ({ id: item.id, index, prev: item.sort_order }))
      .filter((row) => row.prev !== row.index);

    const reordered = current.map((item, index) => ({
      ...item,
      sort_order: index,
    }));
    order.current = reordered;
    setItems(reordered);

    const fallback = preDragOrder.current;
    preDragOrder.current = null;
    if (changed.length === 0) return;
    try {
      const responses = await Promise.all(
        changed.map((row) =>
          fetch(endpoint(row.id), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: row.index }),
          }),
        ),
      );
      if (responses.some((res) => !res.ok)) {
        throw new Error("One or more rows failed to save");
      }
    } catch {
      if (fallback) {
        order.current = fallback;
        setItems(fallback);
      }
      onError?.("Could not save the new order.");
    }
  }

  // Props to spread onto each draggable row (<tr>).
  function rowProps(index: number) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(index, e),
      onDragEnter: () => handleDragEnter(index),
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDragEnd: handleDragEnd,
    };
  }

  return { rowProps };
}
