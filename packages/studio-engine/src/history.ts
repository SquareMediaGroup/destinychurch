import type { StudioNode, NodeId } from "@/packages/studio-schema/src/types";

type NodesSnapshot = Record<NodeId, StudioNode>;

type HistoryEntry = {
  before: NodesSnapshot;
  after: NodesSnapshot;
  label?: string;
  timestamp: number;
};

const COALESCE_WINDOW_MS = 300;
const MAX_HISTORY = 200;

export type HistoryManager = {
  push: (
    before: NodesSnapshot,
    after: NodesSnapshot,
    coalesceKey?: string,
    label?: string
  ) => void;
  undo: () => NodesSnapshot | null;
  redo: () => NodesSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
};

export function createHistoryManager(): HistoryManager {
  let stack: HistoryEntry[] = [];
  let pointer = -1;
  let lastCoalesceKey: string | undefined;
  let lastCoalesceTime = 0;

  return {
    push(before, after, coalesceKey, label) {
      const now = Date.now();

      if (
        coalesceKey &&
        coalesceKey === lastCoalesceKey &&
        now - lastCoalesceTime < COALESCE_WINDOW_MS &&
        pointer >= 0
      ) {
        stack[pointer].after = after;
        stack[pointer].timestamp = now;
        lastCoalesceTime = now;
        return;
      }

      stack = stack.slice(0, pointer + 1);
      stack.push({ before, after, label, timestamp: now });

      if (stack.length > MAX_HISTORY) {
        stack.shift();
      } else {
        pointer++;
      }

      lastCoalesceKey = coalesceKey;
      lastCoalesceTime = now;
    },

    undo(): NodesSnapshot | null {
      if (pointer < 0) return null;
      const entry = stack[pointer];
      pointer--;
      lastCoalesceKey = undefined;
      return JSON.parse(JSON.stringify(entry.before));
    },

    redo(): NodesSnapshot | null {
      if (pointer >= stack.length - 1) return null;
      pointer++;
      const entry = stack[pointer];
      lastCoalesceKey = undefined;
      return JSON.parse(JSON.stringify(entry.after));
    },

    canUndo: () => pointer >= 0,
    canRedo: () => pointer < stack.length - 1,

    clear() {
      stack = [];
      pointer = -1;
      lastCoalesceKey = undefined;
      lastCoalesceTime = 0;
    },
  };
}
