"use client";

import React from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { Tool } from "@/packages/studio-engine/src/store";

type ToolDef = {
  id: Tool;
  icon: string;
  label: string;
  shortcut: string;
};

const tools: ToolDef[] = [
  { id: "select", icon: "arrow_selector_tool", label: "Select", shortcut: "V" },
  { id: "hand", icon: "pan_tool", label: "Hand", shortcut: "H" },
  { id: "frame", icon: "crop_free", label: "Frame", shortcut: "F" },
  { id: "text", icon: "title", label: "Text", shortcut: "T" },
];

export function Toolbar() {
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const canUndo = useStudio((s) => s._history.canUndo());
  const canRedo = useStudio((s) => s._history.canRedo());
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const zoom = useStudio((s) => s.zoom);
  const setZoom = useStudio((s) => s.setZoom);

  return (
    <div
      style={{
        height: 48,
        background: "#1a1a1a",
        borderBottom: "1px solid #2a2a2a",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 4,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "linear-gradient(135deg, #4f8eff, #6366f1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          marginRight: 12,
          flexShrink: 0,
        }}
      >
        S
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: "#333", margin: "0 4px" }} />

      {/* Tools */}
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.shortcut})`}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "none",
            background: tool === t.id ? "#333" : "transparent",
            color: tool === t.id ? "#fff" : "#888",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
            {t.icon}
          </span>
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: "#333", margin: "0 4px" }} />

      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Cmd+Z)"
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: canUndo ? "#888" : "#444",
          cursor: canUndo ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
          undo
        </span>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Cmd+Shift+Z)"
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: canRedo ? "#888" : "#444",
          cursor: canRedo ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
          redo
        </span>
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Zoom controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "#222",
          borderRadius: 6,
          padding: "2px 4px",
        }}
      >
        <button
          onClick={() => setZoom(zoom - 0.1)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "#888",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            remove
          </span>
        </button>
        <span
          style={{
            fontSize: 11,
            color: "#888",
            fontVariantNumeric: "tabular-nums",
            minWidth: 36,
            textAlign: "center",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "#888",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            add
          </span>
        </button>
      </div>
    </div>
  );
}
