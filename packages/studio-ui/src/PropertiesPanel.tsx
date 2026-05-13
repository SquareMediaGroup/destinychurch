"use client";

import React from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import { PositionSection } from "./inspector/PositionSection";
import { LayoutSection } from "./inspector/LayoutSection";
import { FillSection } from "./inspector/FillSection";
import { TypographySection } from "./inspector/TypographySection";
import { EffectsSection } from "./inspector/EffectsSection";

export function PropertiesPanel() {
  const selectedIds = useStudio((s) => s.selectedIds);
  const nodes = useStudio((s) => s.document.nodes);

  const selectedNode =
    selectedIds.length === 1 ? nodes[selectedIds[0]] : undefined;

  return (
    <div
      style={{
        width: 280,
        height: "100%",
        background: "#1a1a1a",
        borderLeft: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #2a2a2a",
          fontSize: 11,
          fontWeight: 600,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Properties</span>
        {selectedNode && (
          <span
            style={{
              fontWeight: 400,
              textTransform: "none",
              color: "#666",
              fontSize: 10,
            }}
          >
            {selectedNode.type}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selectedNode && selectedIds.length === 0 && (
          <EmptyState />
        )}
        {!selectedNode && selectedIds.length > 1 && (
          <MultiSelectState count={selectedIds.length} />
        )}
        {selectedNode && (
          <>
            {/* Node name */}
            <NodeNameEditor node={selectedNode} />
            <PositionSection node={selectedNode} />
            <LayoutSection node={selectedNode} />
            <FillSection node={selectedNode} />
            <TypographySection node={selectedNode} />
            <EffectsSection node={selectedNode} />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 24,
        textAlign: "center",
        color: "#555",
        fontSize: 12,
      }}
    >
      <span
        className="material-symbols-rounded"
        style={{ fontSize: 32, marginBottom: 8, display: "block", color: "#444" }}
      >
        select
      </span>
      Select an element to edit its properties
    </div>
  );
}

function MultiSelectState({ count }: { count: number }) {
  return (
    <div
      style={{
        padding: 24,
        textAlign: "center",
        color: "#555",
        fontSize: 12,
      }}
    >
      <span
        className="material-symbols-rounded"
        style={{ fontSize: 32, marginBottom: 8, display: "block", color: "#444" }}
      >
        select_all
      </span>
      {count} elements selected
    </div>
  );
}

function NodeNameEditor({
  node,
}: {
  node: ReturnType<typeof useStudio.getState>["document"]["nodes"][string];
}) {
  const updateNode = useStudio((s) => s.updateNode);

  return (
    <div style={{ padding: "8px 12px", borderBottom: "1px solid #2a2a2a" }}>
      <input
        type="text"
        value={node.name ?? ""}
        placeholder={node.type}
        onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
        style={{
          width: "100%",
          padding: "5px 8px",
          borderRadius: 5,
          border: "1px solid #333",
          background: "#141414",
          color: "#e0e0e0",
          fontSize: 12,
          fontWeight: 500,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
