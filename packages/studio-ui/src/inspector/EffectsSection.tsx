"use client";

import React from "react";
import type { StudioNode, Shadow } from "@/packages/studio-schema/src/types";
import { NumberInput } from "../inputs/NumberInput";
import { InspectorSection } from "./PositionSection";
import { useStudio } from "@/packages/studio-engine/src/store";

type Props = { node: StudioNode };

function newShadow(): Shadow {
  return { x: 0, y: 4, blur: 12, spread: 0, color: "#000000", opacity: 0.15 };
}

export function EffectsSection({ node }: Props) {
  const transact = useStudio((s) => s.transact);

  const updateStyle = (patch: Partial<StudioNode["style"]>) => {
    transact(
      (nodes) => {
        const n = nodes[node.id];
        if (n) Object.assign(n.style, patch);
      },
      { coalesceKey: `effects-${node.id}`, label: "Update effects" }
    );
  };

  const shadows = node.style.shadow ?? [];

  const updateShadow = (index: number, patch: Partial<Shadow>) => {
    const next = [...shadows];
    next[index] = { ...next[index], ...patch };
    updateStyle({ shadow: next });
  };

  return (
    <InspectorSection title="Effects" defaultOpen={false}>
      {/* Shadows */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 11, color: "#888" }}>Shadows</span>
          <button
            onClick={() => updateStyle({ shadow: [...shadows, newShadow()] })}
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              border: "none",
              background: "#333",
              color: "#ccc",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            + Add
          </button>
        </div>

        {shadows.map((s, i) => (
          <div
            key={i}
            style={{
              background: "#141414",
              borderRadius: 6,
              padding: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 10, color: "#666" }}>
                Shadow {i + 1}
              </span>
              <button
                onClick={() => {
                  const next = shadows.filter((_, idx) => idx !== i);
                  updateStyle({ shadow: next });
                }}
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "#666",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                  close
                </span>
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 4,
              }}
            >
              <NumberInput
                label="X"
                value={s.x}
                onChange={(v) => updateShadow(i, { x: v })}
              />
              <NumberInput
                label="Y"
                value={s.y}
                onChange={(v) => updateShadow(i, { y: v })}
              />
              <NumberInput
                label="Blur"
                value={s.blur}
                onChange={(v) => updateShadow(i, { blur: v })}
                min={0}
              />
              <NumberInput
                label="Spread"
                value={s.spread}
                onChange={(v) => updateShadow(i, { spread: v })}
              />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
              <input
                type="color"
                value={s.color}
                onChange={(e) => updateShadow(i, { color: e.target.value })}
                style={{
                  width: 24,
                  height: 24,
                  border: "1px solid #444",
                  borderRadius: 4,
                  padding: 0,
                  cursor: "pointer",
                }}
              />
              <NumberInput
                label="Opacity"
                value={Math.round((s.opacity ?? 1) * 100)}
                onChange={(v) => updateShadow(i, { opacity: v / 100 })}
                min={0}
                max={100}
                suffix="%"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Blur */}
      <div style={{ marginBottom: 8 }}>
        <NumberInput
          label="Layer blur"
          value={node.style.blur ?? 0}
          onChange={(v) => updateStyle({ blur: v })}
          min={0}
          suffix="px"
        />
      </div>

      <div>
        <NumberInput
          label="Background blur"
          value={node.style.backgroundBlur ?? 0}
          onChange={(v) => updateStyle({ backgroundBlur: v })}
          min={0}
          suffix="px"
        />
      </div>
    </InspectorSection>
  );
}
