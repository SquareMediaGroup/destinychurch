"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { NodeId, StudioNode } from "@/packages/studio-schema/src/types";

type DropPosition = "before" | "inside" | "after";
type DropTarget = { nodeId: NodeId; position: DropPosition } | null;

export function LayersPanel() {
  const rootId = useStudio((s) => s.document.root);
  const [dragOverTarget, setDragOverTarget] = useState<DropTarget>(null);
  const [draggedId, setDraggedId] = useState<NodeId | null>(null);

  const handleDrop = useCallback(
    (target: DropTarget) => {
      if (!draggedId || !target) return;
      if (draggedId === target.nodeId) return;

      const store = useStudio.getState();
      const nodes = store.document.nodes;

      // Prevent dropping a node into its own descendant
      const descendants = store.getDescendants(draggedId);
      if (descendants.includes(target.nodeId)) return;

      store.transact(
        (draft) => {
          // Remove from current parent
          let oldParentId: NodeId | null = null;
          for (const n of Object.values(draft)) {
            if (n.children?.includes(draggedId)) {
              oldParentId = n.id;
              n.children = n.children.filter((id) => id !== draggedId);
              break;
            }
          }

          if (target.position === "inside") {
            // Drop as last child of target
            const targetNode = draft[target.nodeId];
            if (targetNode) {
              if (!targetNode.children) targetNode.children = [];
              targetNode.children.push(draggedId);
            }
          } else {
            // Drop before/after target — find target's parent
            let targetParentId: NodeId | null = null;
            for (const n of Object.values(draft)) {
              if (n.children?.includes(target.nodeId)) {
                targetParentId = n.id;
                break;
              }
            }
            if (targetParentId) {
              const parent = draft[targetParentId];
              if (parent.children) {
                const idx = parent.children.indexOf(target.nodeId);
                const insertIdx =
                  target.position === "after" ? idx + 1 : idx;
                parent.children.splice(insertIdx, 0, draggedId);
              }
            }
          }
        },
        { label: "Reorder layers" }
      );

      setDraggedId(null);
      setDragOverTarget(null);
    },
    [draggedId]
  );

  return (
    <div
      style={{
        width: 240,
        height: "100%",
        background: "#1a1a1a",
        borderRight: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #2a2a2a",
          fontSize: 11,
          fontWeight: 600,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Layers
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        <LayerRow
          nodeId={rootId}
          depth={0}
          draggedId={draggedId}
          dragOverTarget={dragOverTarget}
          onDragStart={setDraggedId}
          onDragOver={setDragOverTarget}
          onDrop={handleDrop}
        />
      </div>
    </div>
  );
}

const LayerRow = memo(function LayerRow({
  nodeId,
  depth,
  draggedId,
  dragOverTarget,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  nodeId: NodeId;
  depth: number;
  draggedId: NodeId | null;
  dragOverTarget: DropTarget;
  onDragStart: (id: NodeId | null) => void;
  onDragOver: (target: DropTarget) => void;
  onDrop: (target: DropTarget) => void;
}) {
  const node = useStudio((s) => s.document.nodes[nodeId]);
  const selectedIds = useStudio((s) => s.selectedIds);
  const hoveredId = useStudio((s) => s.hoveredId);
  const rootId = useStudio((s) => s.document.root);
  const select = useStudio((s) => s.select);
  const setHovered = useStudio((s) => s.setHovered);

  const isSelected = selectedIds.includes(nodeId);
  const isHovered = hoveredId === nodeId;
  const isDragged = draggedId === nodeId;
  const [expanded, setExpanded] = React.useState(depth < 2);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      select([nodeId], e.shiftKey || e.metaKey);
    },
    [nodeId, select]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (nodeId === rootId) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", nodeId);
      onDragStart(nodeId);
    },
    [nodeId, rootId, onDragStart]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedId || draggedId === nodeId) return;

      const rect = rowRef.current?.getBoundingClientRect();
      if (!rect) return;

      const y = e.clientY - rect.top;
      const ratio = y / rect.height;

      let position: DropPosition;
      const hasChildren = (node?.children?.length ?? 0) > 0;

      if (ratio < 0.25) {
        position = "before";
      } else if (ratio > 0.75 || !hasChildren) {
        position = "after";
      } else {
        position = "inside";
      }

      // Don't allow dropping before/after the root
      if (nodeId === rootId && position !== "inside") {
        position = "inside";
      }

      onDragOver({ nodeId, position });
    },
    [draggedId, nodeId, node, rootId, onDragOver]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverTarget) {
        onDrop(dragOverTarget);
      }
    },
    [dragOverTarget, onDrop]
  );

  const handleDragEnd = useCallback(() => {
    onDragStart(null);
    onDragOver(null);
  }, [onDragStart, onDragOver]);

  if (!node) return null;

  const hasChildren = (node.children?.length ?? 0) > 0;
  const displayName = node.name || node.type;
  const isRoot = nodeId === rootId;

  const iconMap: Record<string, string> = {
    frame: "crop_free",
    text: "notes",
    heading: "title",
    image: "image",
    video: "videocam",
    icon: "emoji_symbols",
    button: "smart_button",
    card: "dashboard",
    spacer: "height",
    divider: "horizontal_rule",
    input: "text_fields",
    form: "dynamic_form",
    nav: "menu",
    link: "link",
    embed: "code",
    code: "code",
    richtext: "article",
    "component-instance": "widgets",
  };

  // Drop indicator styling
  const isDropBefore =
    dragOverTarget?.nodeId === nodeId && dragOverTarget?.position === "before";
  const isDropInside =
    dragOverTarget?.nodeId === nodeId && dragOverTarget?.position === "inside";
  const isDropAfter =
    dragOverTarget?.nodeId === nodeId && dragOverTarget?.position === "after";

  return (
    <>
      {/* Drop-before indicator line */}
      {isDropBefore && (
        <div
          style={{
            height: 2,
            background: "#4f8eff",
            marginLeft: 8 + depth * 16,
            marginRight: 8,
            borderRadius: 1,
          }}
        />
      )}

      <div
        ref={rowRef}
        onClick={handleClick}
        onMouseEnter={() => setHovered(nodeId)}
        onMouseLeave={() => setHovered(null)}
        draggable={!isRoot}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px 3px",
          paddingLeft: 8 + depth * 16,
          cursor: isRoot ? "default" : "grab",
          background: isDropInside
            ? "rgba(79, 142, 255, 0.2)"
            : isSelected
              ? "rgba(79, 142, 255, 0.15)"
              : isHovered
                ? "rgba(255,255,255,0.03)"
                : "transparent",
          borderLeft: isSelected
            ? "2px solid #4f8eff"
            : "2px solid transparent",
          fontSize: 12,
          color: isSelected ? "#e0e0e0" : "#999",
          userSelect: "none",
          opacity: isDragged ? 0.4 : 1,
          outline: isDropInside ? "1px dashed #4f8eff" : "none",
          outlineOffset: -1,
        }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              width: 16,
              height: 16,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "#666",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-rounded"
              style={{
                fontSize: 14,
                transform: expanded ? "rotate(0)" : "rotate(-90deg)",
                transition: "transform 0.1s",
              }}
            >
              expand_more
            </span>
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}

        {/* Icon */}
        <span
          className="material-symbols-rounded"
          style={{ fontSize: 14, color: "#666", flexShrink: 0 }}
        >
          {iconMap[node.type] ?? "crop_free"}
        </span>

        {/* Name */}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {displayName}
        </span>

        {/* Visibility */}
        {node.hidden && (
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 14, color: "#555" }}
          >
            visibility_off
          </span>
        )}
        {node.locked && (
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 14, color: "#555" }}
          >
            lock
          </span>
        )}
      </div>

      {/* Drop-after indicator line */}
      {isDropAfter && !hasChildren && (
        <div
          style={{
            height: 2,
            background: "#4f8eff",
            marginLeft: 8 + depth * 16,
            marginRight: 8,
            borderRadius: 1,
          }}
        />
      )}

      {/* Children */}
      {expanded &&
        hasChildren &&
        node.children!.map((childId) => (
          <LayerRow
            key={childId}
            nodeId={childId}
            depth={depth + 1}
            draggedId={draggedId}
            dragOverTarget={dragOverTarget}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}

      {/* Drop-after indicator (after children expanded) */}
      {isDropAfter && hasChildren && expanded && (
        <div
          style={{
            height: 2,
            background: "#4f8eff",
            marginLeft: 8 + depth * 16,
            marginRight: 8,
            borderRadius: 1,
          }}
        />
      )}
    </>
  );
});
