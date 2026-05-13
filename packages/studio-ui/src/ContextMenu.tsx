"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { NodeId } from "@/packages/studio-schema/src/types";

type MenuItem = {
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
};

type ContextMenuState = {
  x: number;
  y: number;
  items: MenuItem[];
} | null;

let globalSetMenu: ((state: ContextMenuState) => void) | null = null;

export function showContextMenu(x: number, y: number, items: MenuItem[]) {
  globalSetMenu?.({ x, y, items });
}

export function hideContextMenu() {
  globalSetMenu?.(null);
}

export function ContextMenuProvider() {
  const [menu, setMenu] = useState<ContextMenuState>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    globalSetMenu = setMenu;
    return () => {
      globalSetMenu = null;
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [menu]);

  if (!menu) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        zIndex: 9999,
        background: "#1e1e1e",
        border: "1px solid #333",
        borderRadius: 8,
        padding: "4px 0",
        minWidth: 180,
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        fontSize: 13,
      }}
    >
      {menu.items.map((item, i) =>
        item.divider ? (
          <div
            key={i}
            style={{
              height: 1,
              background: "#333",
              margin: "4px 8px",
            }}
          />
        ) : (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                setMenu(null);
              }
            }}
            disabled={item.disabled}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 12px",
              border: "none",
              background: "transparent",
              color: item.disabled ? "#555" : "#ddd",
              cursor: item.disabled ? "default" : "pointer",
              textAlign: "left",
              fontSize: 13,
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = "#2a2a2a";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {item.icon && (
              <span
                className="material-symbols-rounded"
                style={{ fontSize: 16, color: item.disabled ? "#444" : "#888" }}
              >
                {item.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span
                style={{
                  fontSize: 11,
                  color: "#666",
                  fontFamily: "monospace",
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}

/**
 * Hook to add context menu to the canvas.
 * Call this from the editor shell.
 */
export function useCanvasContextMenu() {
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const store = useStudio.getState();
    const selectedIds = store.selectedIds;
    const hasSelection = selectedIds.length > 0;

    // Check if right-clicking on a node
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    let clickedNodeId: NodeId | null = null;
    for (const el of elements) {
      const nodeId = (el as HTMLElement).dataset?.nodeId;
      if (nodeId && nodeId !== store.document.root) {
        clickedNodeId = nodeId;
        break;
      }
    }

    // If right-clicked on a non-selected node, select it
    if (clickedNodeId && !selectedIds.includes(clickedNodeId)) {
      store.select([clickedNodeId]);
    }

    const effectiveIds = clickedNodeId
      ? (selectedIds.includes(clickedNodeId) ? selectedIds : [clickedNodeId])
      : selectedIds;

    const items: MenuItem[] = [];

    if (effectiveIds.length > 0) {
      items.push(
        {
          label: "Copy",
          icon: "content_copy",
          shortcut: "⌘C",
          action: () => {
            // TODO: clipboard support
          },
          disabled: true,
        },
        {
          label: "Paste",
          icon: "content_paste",
          shortcut: "⌘V",
          action: () => {},
          disabled: true,
        },
        {
          label: "Duplicate",
          icon: "copy_all",
          shortcut: "⌘D",
          action: () => {
            const newIds = store.duplicateNodes(effectiveIds);
            store.select(newIds);
          },
        },
        {
          label: "Delete",
          icon: "delete",
          shortcut: "⌫",
          action: () => store.deleteNodes(effectiveIds),
        },
        { label: "", action: () => {}, divider: true },
      );

      // Layout options
      const node = store.document.nodes[effectiveIds[0]];
      if (node) {
        items.push(
          {
            label: "Wrap in Frame",
            icon: "crop_free",
            action: () => wrapInFrame(effectiveIds),
          },
          {
            label: node.locked ? "Unlock" : "Lock",
            icon: node.locked ? "lock_open" : "lock",
            action: () => {
              store.transact((nodes) => {
                for (const id of effectiveIds) {
                  const n = nodes[id];
                  if (n) n.locked = !n.locked;
                }
              });
            },
          },
          {
            label: node.hidden ? "Show" : "Hide",
            icon: node.hidden ? "visibility" : "visibility_off",
            action: () => {
              store.transact((nodes) => {
                for (const id of effectiveIds) {
                  const n = nodes[id];
                  if (n) n.hidden = !n.hidden;
                }
              });
            },
          },
        );

        if (effectiveIds.length === 1) {
          items.push(
            { label: "", action: () => {}, divider: true },
            {
              label: "Move to Front",
              icon: "flip_to_front",
              action: () => moveToFront(effectiveIds[0]),
            },
            {
              label: "Move to Back",
              icon: "flip_to_back",
              action: () => moveToBack(effectiveIds[0]),
            },
          );
        }
      }
    } else {
      // Right-clicked empty canvas
      items.push(
        {
          label: "Paste",
          icon: "content_paste",
          shortcut: "⌘V",
          action: () => {},
          disabled: true,
        },
        { label: "", action: () => {}, divider: true },
        {
          label: "Select All",
          icon: "select_all",
          shortcut: "⌘A",
          action: () => store.selectAll(),
        },
      );
    }

    showContextMenu(e.clientX, e.clientY, items);
  }, []);

  return handleContextMenu;
}

function wrapInFrame(nodeIds: NodeId[]) {
  const store = useStudio.getState();
  const { createNodeId } = require("@/packages/studio-schema/src/types");
  const frameId = createNodeId();

  store.transact((nodes) => {
    // Find parent of first node
    let parentId: NodeId | null = null;
    let insertIndex = 0;
    for (const node of Object.values(nodes)) {
      if (node.children) {
        const idx = node.children.indexOf(nodeIds[0]);
        if (idx >= 0) {
          parentId = node.id;
          insertIndex = idx;
          break;
        }
      }
    }
    if (!parentId) return;

    // Create frame
    nodes[frameId] = {
      id: frameId,
      type: "frame",
      name: "Frame",
      layout: {
        mode: "stack",
        direction: "col",
        w: "fill",
        h: "auto",
        gap: 8,
        padding: [16, 16, 16, 16],
      },
      style: {
        fill: { type: "solid", hex: "#ffffff" },
        radius: 8,
      },
      props: { _type: "frame" },
      children: [...nodeIds],
    };

    // Remove nodes from parent and insert frame
    const parent = nodes[parentId];
    if (parent.children) {
      parent.children = parent.children.filter((id) => !nodeIds.includes(id));
      parent.children.splice(insertIndex, 0, frameId);
    }
  }, { label: "Wrap in Frame" });

  store.select([frameId]);
}

function moveToFront(nodeId: NodeId) {
  const store = useStudio.getState();
  store.transact((nodes) => {
    for (const node of Object.values(nodes)) {
      if (node.children) {
        const idx = node.children.indexOf(nodeId);
        if (idx >= 0) {
          node.children.splice(idx, 1);
          node.children.push(nodeId);
          break;
        }
      }
    }
  }, { label: "Move to front" });
}

function moveToBack(nodeId: NodeId) {
  const store = useStudio.getState();
  store.transact((nodes) => {
    for (const node of Object.values(nodes)) {
      if (node.children) {
        const idx = node.children.indexOf(nodeId);
        if (idx >= 0) {
          node.children.splice(idx, 1);
          node.children.unshift(nodeId);
          break;
        }
      }
    }
  }, { label: "Move to back" });
}
