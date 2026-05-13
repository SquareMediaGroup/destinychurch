"use client";

import React, { useState } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { NodeType, NodeProps } from "@/packages/studio-schema/src/types";

type InsertItem = {
  type: NodeType;
  label: string;
  icon: string;
  category: string;
  defaultProps: NodeProps;
};

const INSERT_ITEMS: InsertItem[] = [
  // Primitives
  {
    type: "frame",
    label: "Frame",
    icon: "crop_free",
    category: "Layout",
    defaultProps: { _type: "frame" },
  },
  {
    type: "text",
    label: "Text",
    icon: "notes",
    category: "Primitives",
    defaultProps: { _type: "text", content: "Text block" },
  },
  {
    type: "heading",
    label: "Heading",
    icon: "title",
    category: "Primitives",
    defaultProps: { _type: "heading", content: "Heading", level: 2 },
  },
  {
    type: "image",
    label: "Image",
    icon: "image",
    category: "Primitives",
    defaultProps: { _type: "image", src: "", alt: "Image" },
  },
  {
    type: "button",
    label: "Button",
    icon: "smart_button",
    category: "Primitives",
    defaultProps: {
      _type: "button",
      label: "Button",
      variant: "primary",
      size: "md",
    },
  },
  {
    type: "icon",
    label: "Icon",
    icon: "emoji_symbols",
    category: "Primitives",
    defaultProps: {
      _type: "icon",
      icon: { lib: "material", name: "star", size: 24 },
    },
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: "height",
    category: "Primitives",
    defaultProps: { _type: "spacer", size: 40 },
  },
  {
    type: "divider",
    label: "Divider",
    icon: "horizontal_rule",
    category: "Primitives",
    defaultProps: { _type: "divider" },
  },
  {
    type: "card",
    label: "Card",
    icon: "dashboard",
    category: "Layout",
    defaultProps: { _type: "card", variant: "default" },
  },
  {
    type: "input",
    label: "Input",
    icon: "text_fields",
    category: "Form",
    defaultProps: { _type: "input", placeholder: "Enter text...", type: "text" },
  },
  {
    type: "form",
    label: "Form",
    icon: "dynamic_form",
    category: "Form",
    defaultProps: { _type: "form", method: "POST" },
  },
  {
    type: "nav",
    label: "Nav",
    icon: "menu",
    category: "Layout",
    defaultProps: {
      _type: "nav",
      items: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
      ],
      sticky: false,
    },
  },
  {
    type: "embed",
    label: "Embed",
    icon: "code",
    category: "Media",
    defaultProps: { _type: "embed", html: "" },
  },
  {
    type: "video",
    label: "Video",
    icon: "videocam",
    category: "Media",
    defaultProps: { _type: "video", controls: true },
  },
  {
    type: "richtext",
    label: "Rich Text",
    icon: "article",
    category: "Primitives",
    defaultProps: { _type: "richtext", html: "<p>Rich text content</p>" },
  },
];

const CATEGORIES = ["Layout", "Primitives", "Form", "Media"];

export function InsertPanel() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const addNode = useStudio((s) => s.addNode);
  const selectedIds = useStudio((s) => s.selectedIds);

  const filtered = INSERT_ITEMS.filter((item) => {
    if (activeCategory && item.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleInsert = (item: InsertItem) => {
    const parentId =
      selectedIds.length === 1 ? selectedIds[0] : undefined;
    const overrides: Record<string, unknown> = {};

    if (item.type === "frame") {
      overrides.layout = {
        mode: "stack" as const,
        direction: "col" as const,
        w: "fill" as const,
        h: "auto" as const,
        gap: 8,
        padding: [16, 16, 16, 16],
      };
      overrides.style = {
        fill: { type: "solid", hex: "#ffffff" },
        radius: 8,
      };
      overrides.children = [];
    }

    if (item.type === "card") {
      overrides.layout = {
        mode: "stack" as const,
        direction: "col" as const,
        w: "fill" as const,
        h: "auto" as const,
        gap: 12,
        padding: [20, 20, 20, 20],
      };
      overrides.style = {
        fill: { type: "solid", hex: "#ffffff" },
        radius: 12,
        shadow: [{ x: 0, y: 2, blur: 8, spread: 0, color: "#000000", opacity: 0.08 }],
      };
      overrides.children = [];
    }

    const id = addNode(item.type, item.defaultProps, parentId, undefined, overrides as never);
    useStudio.getState().select([id]);
  };

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
        }}
      >
        <input
          type="text"
          placeholder="Search elements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #333",
            background: "#141414",
            color: "#e0e0e0",
            fontSize: 12,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "6px 8px",
          borderBottom: "1px solid #2a2a2a",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: "3px 8px",
            borderRadius: 4,
            border: "none",
            background: !activeCategory ? "#333" : "transparent",
            color: !activeCategory ? "#fff" : "#888",
            fontSize: 11,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: "none",
              background: activeCategory === cat ? "#333" : "transparent",
              color: activeCategory === cat ? "#fff" : "#888",
              fontSize: 11,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
          }}
        >
          {filtered.map((item) => (
            <button
              key={item.type}
              onClick={() => handleInsert(item)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "12px 8px",
                borderRadius: 8,
                border: "1px solid #2a2a2a",
                background: "#1e1e1e",
                color: "#ccc",
                cursor: "pointer",
                fontSize: 11,
                transition: "background 0.1s, border-color 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#252525";
                e.currentTarget.style.borderColor = "#444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1e1e1e";
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: 22, color: "#888" }}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
