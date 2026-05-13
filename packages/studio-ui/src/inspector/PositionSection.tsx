"use client";

import React from "react";
import type { StudioNode } from "@/packages/studio-schema/src/types";
import { NumberInput } from "../inputs/NumberInput";
import { UnitInput } from "../inputs/UnitInput";
import { useStudio } from "@/packages/studio-engine/src/store";

type Props = { node: StudioNode };

export function PositionSection({ node }: Props) {
  const transact = useStudio((s) => s.transact);

  const updateLayout = (patch: Partial<StudioNode["layout"]>) => {
    transact(
      (nodes) => {
        const n = nodes[node.id];
        if (n) Object.assign(n.layout, patch);
      },
      { coalesceKey: `layout-${node.id}`, label: "Update position" }
    );
  };

  return (
    <InspectorSection title="Position & Size">
      {/* Position mode */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {(["stack", "absolute", "grid"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => updateLayout({ mode })}
            style={{
              flex: 1,
              padding: "4px 6px",
              borderRadius: 4,
              border: "none",
              background: node.layout.mode === mode ? "#333" : "transparent",
              color: node.layout.mode === mode ? "#fff" : "#888",
              fontSize: 11,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* X, Y (only for absolute) */}
      {node.layout.mode === "absolute" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
          <NumberInput
            label="X"
            value={node.layout.x}
            onChange={(v) => updateLayout({ x: v })}
            step={1}
          />
          <NumberInput
            label="Y"
            value={node.layout.y}
            onChange={(v) => updateLayout({ y: v })}
            step={1}
          />
        </div>
      )}

      {/* W, H */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        <UnitInput
          label="W"
          value={node.layout.w}
          onChange={(v) => updateLayout({ w: v })}
        />
        <UnitInput
          label="H"
          value={node.layout.h}
          onChange={(v) => updateLayout({ h: v })}
        />
      </div>

      {/* Rotation */}
      <NumberInput
        label="Rotation"
        value={node.layout.rotation ?? 0}
        onChange={(v) => updateLayout({ rotation: v })}
        suffix="deg"
        min={-360}
        max={360}
      />
    </InspectorSection>
  );
}

// Shared accordion section wrapper
export function InspectorSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div style={{ borderBottom: "1px solid #2a2a2a" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          border: "none",
          background: "transparent",
          color: "#ccc",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
        <span
          className="material-symbols-rounded"
          style={{
            fontSize: 16,
            transform: open ? "rotate(0)" : "rotate(-90deg)",
            transition: "transform 0.15s",
          }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px" }}>{children}</div>
      )}
    </div>
  );
}
