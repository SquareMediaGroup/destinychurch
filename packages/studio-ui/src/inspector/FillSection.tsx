"use client";

import React from "react";
import type { StudioNode, Color, Shadow } from "@/packages/studio-schema/src/types";
import { ColorInput } from "../inputs/ColorInput";
import { NumberInput } from "../inputs/NumberInput";
import { InspectorSection } from "./PositionSection";
import { useStudio } from "@/packages/studio-engine/src/store";

type Props = { node: StudioNode };

export function FillSection({ node }: Props) {
  const transact = useStudio((s) => s.transact);
  const tokens = useStudio((s) => s.document.tokens);

  const updateStyle = (patch: Partial<StudioNode["style"]>) => {
    transact(
      (nodes) => {
        const n = nodes[node.id];
        if (n) Object.assign(n.style, patch);
      },
      { coalesceKey: `fill-${node.id}`, label: "Update fill" }
    );
  };

  return (
    <InspectorSection title="Fill & Stroke">
      {/* Fill */}
      <div style={{ marginBottom: 10 }}>
        <ColorInput
          label="Fill"
          value={node.style.fill}
          onChange={(color) => updateStyle({ fill: color })}
          tokens={tokens}
        />
      </div>

      {/* Stroke */}
      <div style={{ marginBottom: 10 }}>
        <ColorInput
          label="Stroke"
          value={node.style.stroke}
          onChange={(color) => updateStyle({ stroke: color })}
          tokens={tokens}
        />
      </div>

      {node.style.stroke && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <NumberInput
            label="Width"
            value={node.style.strokeWidth ?? 1}
            onChange={(v) => updateStyle({ strokeWidth: v })}
            min={0}
            suffix="px"
          />
          <div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
              Style
            </div>
            <select
              value={node.style.strokeStyle ?? "solid"}
              onChange={(e) =>
                updateStyle({
                  strokeStyle: e.target.value as "solid" | "dashed" | "dotted",
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
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
        </div>
      )}

      {/* Border radius */}
      <div style={{ marginBottom: 10 }}>
        <NumberInput
          label="Radius"
          value={
            Array.isArray(node.style.radius)
              ? node.style.radius[0]
              : (node.style.radius ?? 0)
          }
          onChange={(v) => updateStyle({ radius: v })}
          min={0}
          suffix="px"
        />
      </div>

      {/* Opacity */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#888",
            marginBottom: 4,
          }}
        >
          <span>Opacity</span>
          <span>{Math.round((node.style.opacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((node.style.opacity ?? 1) * 100)}
          onChange={(e) =>
            updateStyle({ opacity: parseInt(e.target.value) / 100 })
          }
          style={{ width: "100%", accentColor: "#4f8eff" }}
        />
      </div>
    </InspectorSection>
  );
}
