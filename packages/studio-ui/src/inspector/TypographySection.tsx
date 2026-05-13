"use client";

import React from "react";
import type { StudioNode, FontStyle } from "@/packages/studio-schema/src/types";
import { NumberInput } from "../inputs/NumberInput";
import { ColorInput } from "../inputs/ColorInput";
import { InspectorSection } from "./PositionSection";
import { useStudio } from "@/packages/studio-engine/src/store";

type Props = { node: StudioNode };

const FONT_FAMILIES = [
  { label: "System", value: "system-ui, -apple-system, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Mono", value: "'JetBrains Mono', monospace" },
];

const FONT_WEIGHTS = [
  { label: "Thin", value: 100 },
  { label: "Light", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semibold", value: 600 },
  { label: "Bold", value: 700 },
  { label: "Extra Bold", value: 800 },
  { label: "Black", value: 900 },
];

export function TypographySection({ node }: Props) {
  const transact = useStudio((s) => s.transact);
  const tokens = useStudio((s) => s.document.tokens);
  const font = node.style.font ?? {};

  const updateFont = (patch: Partial<FontStyle>) => {
    transact(
      (nodes) => {
        const n = nodes[node.id];
        if (n) {
          n.style.font = { ...n.style.font, ...patch };
        }
      },
      { coalesceKey: `font-${node.id}`, label: "Update typography" }
    );
  };

  // Only show for text-bearing nodes
  const isText =
    node.type === "text" ||
    node.type === "heading" ||
    node.type === "button" ||
    node.type === "richtext";
  if (!isText) return null;

  return (
    <InspectorSection title="Typography">
      {/* Font family */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
          Font
        </div>
        <select
          value={(font.family as string) ?? ""}
          onChange={(e) => updateFont({ family: e.target.value || undefined })}
          style={{
            width: "100%",
            padding: "5px 8px",
            borderRadius: 5,
            border: "1px solid #333",
            background: "#141414",
            color: "#e0e0e0",
            fontSize: 12,
            outline: "none",
          }}
        >
          <option value="">Default</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size + Weight */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <NumberInput
          label="Size"
          value={font.size}
          onChange={(v) => updateFont({ size: v })}
          min={1}
          max={999}
          suffix="px"
        />
        <div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            Weight
          </div>
          <select
            value={font.weight ?? 400}
            onChange={(e) => updateFont({ weight: parseInt(e.target.value) })}
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
            {FONT_WEIGHTS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Line height + Letter spacing */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <NumberInput
          label="Line Height"
          value={typeof font.lineHeight === "number" ? font.lineHeight : undefined}
          onChange={(v) => updateFont({ lineHeight: v })}
          min={0}
          step={0.1}
        />
        <NumberInput
          label="Spacing"
          value={font.letterSpacing}
          onChange={(v) => updateFont({ letterSpacing: v })}
          step={0.1}
          suffix="px"
        />
      </div>

      {/* Text color */}
      <div style={{ marginBottom: 8 }}>
        <ColorInput
          label="Color"
          value={node.style.color}
          onChange={(color) => {
            transact(
              (nodes) => {
                const n = nodes[node.id];
                if (n) n.style.color = color;
              },
              { coalesceKey: `color-${node.id}`, label: "Change text color" }
            );
          }}
          tokens={tokens}
        />
      </div>

      {/* Alignment */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
          Align
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {(["left", "center", "right", "justify"] as const).map((align) => (
            <button
              key={align}
              onClick={() => updateFont({ textAlign: align })}
              style={{
                flex: 1,
                padding: "4px",
                borderRadius: 4,
                border: "none",
                background: font.textAlign === align ? "#333" : "transparent",
                color: font.textAlign === align ? "#fff" : "#888",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: 16 }}
              >
                {`format_align_${align}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Decoration & Transform */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            Decoration
          </div>
          <select
            value={font.textDecoration ?? "none"}
            onChange={(e) =>
              updateFont({
                textDecoration: e.target.value as FontStyle["textDecoration"],
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
            <option value="none">None</option>
            <option value="underline">Underline</option>
            <option value="line-through">Strikethrough</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            Transform
          </div>
          <select
            value={font.textTransform ?? "none"}
            onChange={(e) =>
              updateFont({
                textTransform: e.target.value as FontStyle["textTransform"],
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
            <option value="none">None</option>
            <option value="uppercase">Uppercase</option>
            <option value="lowercase">Lowercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </div>
      </div>
    </InspectorSection>
  );
}
