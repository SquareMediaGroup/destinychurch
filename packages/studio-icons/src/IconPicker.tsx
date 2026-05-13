"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { IconRef, PhosphorWeight } from "@/packages/studio-schema/src/types";
import {
  MATERIAL_ICONS,
  PHOSPHOR_ICONS,
  PHOSPHOR_WEIGHTS,
  type IconEntry,
} from "./registry";
import { StudioIcon } from "./Icon";

type IconPickerProps = {
  value?: IconRef;
  onChange: (icon: IconRef) => void;
  onClose?: () => void;
};

export function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [lib, setLib] = useState<"material" | "phosphor">(
    value?.lib ?? "material"
  );
  const [search, setSearch] = useState("");
  const [weight, setWeight] = useState<PhosphorWeight>(
    value?.weight ?? "regular"
  );
  const [category, setCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const icons = lib === "material" ? MATERIAL_ICONS : PHOSPHOR_ICONS;

  const filtered = useMemo(() => {
    let result = icons;
    if (category) {
      result = result.filter((i) => i.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [icons, search, category]);

  const categories = useMemo(
    () => [...new Set(icons.map((i) => i.category))],
    [icons]
  );

  const handleSelect = useCallback(
    (entry: IconEntry) => {
      const ref: IconRef = {
        lib,
        name: entry.name,
        ...(lib === "phosphor" && weight !== "regular" ? { weight } : {}),
      };
      onChange(ref);
    },
    [lib, weight, onChange]
  );

  return (
    <div
      style={{
        width: 320,
        maxHeight: 480,
        background: "#1e1e1e",
        border: "1px solid #333",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontSize: 13,
        color: "#e0e0e0",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px 8px",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 8,
            background: "#141414",
            borderRadius: 6,
            padding: 2,
          }}
        >
          {(["material", "phosphor"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLib(l);
                setCategory(null);
              }}
              style={{
                flex: 1,
                padding: "5px 8px",
                borderRadius: 5,
                border: "none",
                background: lib === l ? "#333" : "transparent",
                color: lib === l ? "#fff" : "#888",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {l === "material" ? "Material" : "Phosphor"}
            </button>
          ))}
        </div>

        <input
          ref={searchRef}
          type="text"
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "7px 10px",
            borderRadius: 6,
            border: "1px solid #333",
            background: "#141414",
            color: "#e0e0e0",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Phosphor weight picker */}
      {lib === "phosphor" && (
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: "6px 12px",
            borderBottom: "1px solid #2a2a2a",
            overflowX: "auto",
          }}
        >
          {PHOSPHOR_WEIGHTS.map((w) => (
            <button
              key={w}
              onClick={() => setWeight(w)}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                border: "none",
                background: weight === w ? "#4f8eff" : "transparent",
                color: weight === w ? "#fff" : "#888",
                fontSize: 11,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "6px 12px",
          borderBottom: "1px solid #2a2a2a",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setCategory(null)}
          style={{
            padding: "2px 8px",
            borderRadius: 4,
            border: "none",
            background: !category ? "#333" : "transparent",
            color: !category ? "#fff" : "#888",
            fontSize: 11,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              border: "none",
              background: category === c ? "#333" : "transparent",
              color: category === c ? "#fff" : "#888",
              fontSize: 11,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Icon grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 2,
        }}
      >
        {filtered.map((entry) => {
          const isSelected =
            value?.lib === lib && value?.name === entry.name;
          return (
            <button
              key={entry.name}
              onClick={() => handleSelect(entry)}
              title={entry.name}
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                border: "none",
                background: isSelected ? "#4f8eff" : "transparent",
                color: isSelected ? "#fff" : "#ccc",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <StudioIcon
                icon={{
                  lib,
                  name: entry.name,
                  size: 20,
                  ...(lib === "phosphor" ? { weight } : {}),
                }}
              />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: 24,
              textAlign: "center",
              color: "#666",
            }}
          >
            No icons found
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid #2a2a2a",
          fontSize: 11,
          color: "#666",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{filtered.length} icons</span>
        {value && (
          <span>
            {value.lib}:{value.name}
          </span>
        )}
      </div>
    </div>
  );
}
