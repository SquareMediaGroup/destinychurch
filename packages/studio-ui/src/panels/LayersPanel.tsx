"use client";

import React, { memo, useCallback } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { NodeId, StudioNode } from "@/packages/studio-schema/src/types";

export function LayersPanel() {
  const rootId = useStudio((s) => s.document.root);

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
        <LayerRow nodeId={rootId} depth={0} />
      </div>
    </div>
  );
}

const LayerRow = memo(function LayerRow({
  nodeId,
  depth,
}: {
  nodeId: NodeId;
  depth: number;
}) {
  const node = useStudio((s) => s.document.nodes[nodeId]);
  const selectedIds = useStudio((s) => s.selectedIds);
  const hoveredId = useStudio((s) => s.hoveredId);
  const select = useStudio((s) => s.select);
  const setHovered = useStudio((s) => s.setHovered);

  const isSelected = selectedIds.includes(nodeId);
  const isHovered = hoveredId === nodeId;
  const [expanded, setExpanded] = React.useState(depth < 2);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      select([nodeId], e.shiftKey || e.metaKey);
    },
    [nodeId, select]
  );

  if (!node) return null;

  const hasChildren = (node.children?.length ?? 0) > 0;
  const displayName = node.name || node.type;

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

  return (
    <>
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(nodeId)}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px 3px",
          paddingLeft: 8 + depth * 16,
          cursor: "pointer",
          background: isSelected
            ? "rgba(79, 142, 255, 0.15)"
            : isHovered
              ? "rgba(255,255,255,0.03)"
              : "transparent",
          borderLeft: isSelected ? "2px solid #4f8eff" : "2px solid transparent",
          fontSize: 12,
          color: isSelected ? "#e0e0e0" : "#999",
          userSelect: "none",
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

      {/* Children */}
      {expanded &&
        hasChildren &&
        node.children!.map((childId) => (
          <LayerRow key={childId} nodeId={childId} depth={depth + 1} />
        ))}
    </>
  );
});
