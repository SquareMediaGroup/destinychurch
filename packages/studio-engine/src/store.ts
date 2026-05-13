"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  StudioDocument,
  StudioNode,
  NodeId,
  NodeType,
  NodeProps,
  Breakpoint,
} from "@/packages/studio-schema/src/types";
import { createDocument } from "@/packages/studio-schema/src/types";
import { createHistoryManager, type HistoryManager } from "./history";

// ── Types ────────────────────────────────────────────────────────────────────

export type Tool =
  | "select"
  | "hand"
  | "frame"
  | "text"
  | "image"
  | "shape"
  | "pen"
  | "comment";

export type StudioState = {
  document: StudioDocument;
  dirty: boolean;
  saving: boolean;

  // Non-persisted ephemeral state
  selectedIds: NodeId[];
  hoveredId: NodeId | null;
  editingId: NodeId | null;
  tool: Tool;
  activeBreakpoint: Breakpoint;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  snapEnabled: boolean;
  guidesVisible: boolean;

  // History
  _history: HistoryManager;
};

export type StudioActions = {
  // Document
  loadDocument: (doc: StudioDocument) => void;
  resetDocument: (pageId: string) => void;

  // Transactions
  transact: (
    fn: (nodes: Record<NodeId, StudioNode>) => void,
    opts?: { coalesceKey?: string; label?: string }
  ) => void;

  // Node CRUD
  addNode: (
    type: NodeType,
    props: NodeProps,
    parentId?: NodeId,
    index?: number,
    overrides?: Partial<Omit<StudioNode, "id" | "type" | "props">>
  ) => NodeId;
  deleteNodes: (ids: NodeId[]) => void;
  duplicateNodes: (ids: NodeId[]) => NodeId[];
  moveNode: (nodeId: NodeId, newParentId: NodeId, index?: number) => void;
  updateNode: (id: NodeId, patch: Partial<StudioNode>) => void;

  // Selection
  select: (ids: NodeId[], append?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setHovered: (id: NodeId | null) => void;
  setEditing: (id: NodeId | null) => void;

  // Tool
  setTool: (tool: Tool) => void;

  // Viewport
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  zoomToFit: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  // Breakpoints
  setActiveBreakpoint: (bp: Breakpoint) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence
  markDirty: () => void;
  markSaved: () => void;

  // Helpers
  getNode: (id: NodeId) => StudioNode | undefined;
  getParent: (id: NodeId) => StudioNode | undefined;
  getChildren: (id: NodeId) => StudioNode[];
  getAncestors: (id: NodeId) => StudioNode[];
  getDescendants: (id: NodeId) => NodeId[];
};

export type StudioStore = StudioState & StudioActions;

// ── Helpers ──────────────────────────────────────────────────────────────────

function findParent(
  nodes: Record<NodeId, StudioNode>,
  targetId: NodeId
): StudioNode | undefined {
  for (const node of Object.values(nodes)) {
    if (node.children?.includes(targetId)) return node;
  }
  return undefined;
}

function collectDescendants(
  nodes: Record<NodeId, StudioNode>,
  id: NodeId
): NodeId[] {
  const result: NodeId[] = [];
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    const children = nodes[current]?.children;
    if (children) stack.push(...children);
  }
  return result;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useStudio = create<StudioStore>()(
  immer((set, get) => {
    const history = createHistoryManager();

    return {
      document: createDocument("untitled"),
      dirty: false,
      saving: false,
      selectedIds: [],
      hoveredId: null,
      editingId: null,
      tool: "select" as Tool,
      activeBreakpoint: "base" as Breakpoint,
      zoom: 1,
      panX: 0,
      panY: 0,
      showGrid: true,
      snapEnabled: true,
      guidesVisible: true,
      _history: history,

      // ── Document ─────────────────────────────────────────────────────

      loadDocument: (doc) =>
        set((s) => {
          s.document = doc;
          s.dirty = false;
          s.selectedIds = [];
          s.hoveredId = null;
          s.editingId = null;
          s._history.clear();
        }),

      resetDocument: (pageId) =>
        set((s) => {
          s.document = createDocument(pageId);
          s.dirty = false;
          s.selectedIds = [];
          s._history.clear();
        }),

      // ── Transactions ─────────────────────────────────────────────────

      transact: (fn, opts) =>
        set((s) => {
          const before = JSON.parse(JSON.stringify(s.document.nodes));
          fn(s.document.nodes);
          const after = JSON.parse(JSON.stringify(s.document.nodes));
          s._history.push(before, after, opts?.coalesceKey, opts?.label);
          s.dirty = true;
        }),

      // ── Node CRUD ────────────────────────────────────────────────────

      addNode: (type, props, parentId, index, overrides) => {
        const { createNodeId } = require("@/packages/studio-schema/src/types");
        const id = createNodeId();
        set((s) => {
          const node: StudioNode = {
            id,
            type,
            layout: {
              mode: "stack",
              w: "fill",
              h: "auto",
              ...overrides?.layout,
            },
            style: { ...overrides?.style },
            props,
            children: overrides?.children,
            name: overrides?.name,
          };
          s.document.nodes[id] = node;
          const pid = parentId ?? s.document.root;
          const parent = s.document.nodes[pid];
          if (parent) {
            if (!parent.children) parent.children = [];
            if (index !== undefined) {
              parent.children.splice(index, 0, id);
            } else {
              parent.children.push(id);
            }
          }
          s.dirty = true;
        });
        return id;
      },

      deleteNodes: (ids) =>
        set((s) => {
          const allIds = new Set<NodeId>();
          for (const id of ids) {
            for (const desc of collectDescendants(s.document.nodes, id)) {
              allIds.add(desc);
            }
          }
          for (const node of Object.values(s.document.nodes)) {
            if (node.children) {
              node.children = node.children.filter((c) => !allIds.has(c));
            }
          }
          for (const id of allIds) {
            delete s.document.nodes[id];
          }
          s.selectedIds = s.selectedIds.filter((id) => !allIds.has(id));
          s.dirty = true;
        }),

      duplicateNodes: (ids) => {
        const newIds: NodeId[] = [];
        set((s) => {
          const { createNodeId } = require("@/packages/studio-schema/src/types");
          for (const id of ids) {
            const original = s.document.nodes[id];
            if (!original) continue;
            const newId = createNodeId();
            const clone: StudioNode = JSON.parse(JSON.stringify(original));
            clone.id = newId;
            clone.name = clone.name ? `${clone.name} copy` : undefined;
            if (clone.layout.x !== undefined) clone.layout.x += 20;
            if (clone.layout.y !== undefined) clone.layout.y += 20;
            s.document.nodes[newId] = clone;
            const parent = findParent(s.document.nodes, id);
            if (parent?.children) {
              const idx = parent.children.indexOf(id);
              parent.children.splice(idx + 1, 0, newId);
            }
            newIds.push(newId);
          }
          s.dirty = true;
        });
        return newIds;
      },

      moveNode: (nodeId, newParentId, index) =>
        set((s) => {
          const oldParent = findParent(s.document.nodes, nodeId);
          if (oldParent?.children) {
            oldParent.children = oldParent.children.filter(
              (c) => c !== nodeId
            );
          }
          const newParent = s.document.nodes[newParentId];
          if (newParent) {
            if (!newParent.children) newParent.children = [];
            if (index !== undefined) {
              newParent.children.splice(index, 0, nodeId);
            } else {
              newParent.children.push(nodeId);
            }
          }
          s.dirty = true;
        }),

      updateNode: (id, patch) =>
        set((s) => {
          const node = s.document.nodes[id];
          if (!node) return;
          Object.assign(node, patch);
          s.dirty = true;
        }),

      // ── Selection ────────────────────────────────────────────────────

      select: (ids, append) =>
        set((s) => {
          if (append) {
            const existing = new Set(s.selectedIds);
            for (const id of ids) {
              if (existing.has(id)) {
                existing.delete(id);
              } else {
                existing.add(id);
              }
            }
            s.selectedIds = Array.from(existing);
          } else {
            s.selectedIds = ids;
          }
        }),

      selectAll: () =>
        set((s) => {
          const root = s.document.nodes[s.document.root];
          s.selectedIds = root?.children ?? [];
        }),

      clearSelection: () =>
        set((s) => {
          s.selectedIds = [];
          s.editingId = null;
        }),

      setHovered: (id) =>
        set((s) => {
          s.hoveredId = id;
        }),

      setEditing: (id) =>
        set((s) => {
          s.editingId = id;
          if (id) s.selectedIds = [id];
        }),

      // ── Tool ─────────────────────────────────────────────────────────

      setTool: (tool) =>
        set((s) => {
          s.tool = tool;
          if (tool !== "select") {
            s.editingId = null;
          }
        }),

      // ── Viewport ─────────────────────────────────────────────────────

      setZoom: (zoom) =>
        set((s) => {
          s.zoom = Math.max(0.1, Math.min(8, zoom));
        }),

      setPan: (x, y) =>
        set((s) => {
          s.panX = x;
          s.panY = y;
        }),

      zoomToFit: () =>
        set((s) => {
          s.zoom = 1;
          s.panX = 0;
          s.panY = 0;
        }),

      toggleGrid: () =>
        set((s) => {
          s.showGrid = !s.showGrid;
        }),

      toggleSnap: () =>
        set((s) => {
          s.snapEnabled = !s.snapEnabled;
        }),

      // ── Breakpoints ──────────────────────────────────────────────────

      setActiveBreakpoint: (bp) =>
        set((s) => {
          s.activeBreakpoint = bp;
        }),

      // ── History ──────────────────────────────────────────────────────

      undo: () =>
        set((s) => {
          const snapshot = s._history.undo();
          if (snapshot) s.document.nodes = snapshot;
        }),

      redo: () =>
        set((s) => {
          const snapshot = s._history.redo();
          if (snapshot) s.document.nodes = snapshot;
        }),

      canUndo: () => get()._history.canUndo(),
      canRedo: () => get()._history.canRedo(),

      // ── Persistence ──────────────────────────────────────────────────

      markDirty: () => set((s) => { s.dirty = true; }),
      markSaved: () => set((s) => { s.dirty = false; s.saving = false; }),

      // ── Helpers ──────────────────────────────────────────────────────

      getNode: (id) => get().document.nodes[id],
      getParent: (id) => findParent(get().document.nodes, id),
      getChildren: (id) => {
        const node = get().document.nodes[id];
        if (!node?.children) return [];
        return node.children
          .map((cid) => get().document.nodes[cid])
          .filter(Boolean);
      },
      getAncestors: (id) => {
        const ancestors: StudioNode[] = [];
        let current = findParent(get().document.nodes, id);
        while (current) {
          ancestors.push(current);
          current = findParent(get().document.nodes, current.id);
        }
        return ancestors;
      },
      getDescendants: (id) => collectDescendants(get().document.nodes, id),
    };
  })
);
