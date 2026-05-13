"use client";

import React from "react";
import type { StudioNode } from "@/packages/studio-schema/src/types";
import { NumberInput } from "../inputs/NumberInput";
import { InspectorSection } from "./PositionSection";
import { useStudio } from "@/packages/studio-engine/src/store";

type Props = { node: StudioNode };

export function LayoutSection({ node }: Props) {
  const transact = useStudio((s) => s.transact);

  const updateLayout = (patch: Partial<StudioNode["layout"]>) => {
    transact(
      (nodes) => {
        const n = nodes[node.id];
        if (n) Object.assign(n.layout, patch);
      },
      { coalesceKey: `layout-${node.id}`, label: "Update layout" }
    );
  };

  if (node.layout.mode !== "stack" && node.layout.mode !== "grid") {
    return null;
  }

  return (
    <InspectorSection title="Layout">
      {/* Direction (stack) */}
      {node.layout.mode === "stack" && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            Direction
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {(["col", "row"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => updateLayout({ direction: dir })}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "none",
                  background: node.layout.direction === dir ? "#333" : "transparent",
                  color: node.layout.direction === dir ? "#fff" : "#888",
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                  {dir === "col" ? "view_stream" : "view_column"}
                </span>
                {dir === "col" ? "Vertical" : "Horizontal"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gap */}
      <div style={{ marginBottom: 8 }}>
        <NumberInput
          label="Gap"
          value={node.layout.gap ?? 0}
          onChange={(v) => updateLayout({ gap: v })}
          min={0}
          suffix="px"
        />
      </div>

      {/* Columns (grid) */}
      {node.layout.mode === "grid" && (
        <div style={{ marginBottom: 8 }}>
          <NumberInput
            label="Columns"
            value={node.layout.columns ?? 2}
            onChange={(v) => updateLayout({ columns: v })}
            min={1}
            max={12}
          />
        </div>
      )}

      {/* Padding */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
          Padding
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
          {(["Top", "Right", "Bottom", "Left"] as const).map((side, i) => (
            <NumberInput
              key={side}
              label={side[0]}
              value={node.layout.padding?.[i] ?? 0}
              onChange={(v) => {
                const padding = [...(node.layout.padding ?? [0, 0, 0, 0])] as [
                  number,
                  number,
                  number,
                  number
                ];
                padding[i] = v;
                updateLayout({ padding });
              }}
              min={0}
            />
          ))}
        </div>
      </div>

      {/* Align & Justify */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            Align
          </div>
          <select
            value={node.layout.alignItems ?? "stretch"}
            onChange={(e) =>
              updateLayout({
                alignItems: e.target.value as StudioNode["layout"]["alignItems"],
              })
            }
            style={{
              width: "100%",
              padding: "5px 6px",
              borderRadius: 5,
              border: "1px solid #333",
              background: "#141414",
              color: "#e0e0e0",
              fontSize: 11,
              outline: "none",
            }}
          >
            {["start", "center", "end", "stretch", "baseline"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            Justify
          </div>
          <select
            value={node.layout.justifyContent ?? "start"}
            onChange={(e) =>
              updateLayout({
                justifyContent: e.target.value as StudioNode["layout"]["justifyContent"],
              })
            }
            style={{
              width: "100%",
              padding: "5px 6px",
              borderRadius: 5,
              border: "1px solid #333",
              background: "#141414",
              color: "#e0e0e0",
              fontSize: 11,
              outline: "none",
            }}
          >
            {["start", "center", "end", "between", "around", "evenly"].map(
              (v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Wrap */}
      {node.layout.mode === "stack" && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            fontSize: 11,
            color: "#888",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={node.layout.wrap ?? false}
            onChange={(e) => updateLayout({ wrap: e.target.checked })}
            style={{ accentColor: "#4f8eff" }}
          />
          Wrap
        </label>
      )}
    </InspectorSection>
  );
}
