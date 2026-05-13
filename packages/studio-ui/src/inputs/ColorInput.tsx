"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Color, TokenSet } from "@/packages/studio-schema/src/types";
import { colorToCSS } from "@/packages/studio-tokens/src/resolve";

type ColorInputProps = {
  value: Color | undefined;
  onChange: (color: Color) => void;
  tokens: TokenSet;
  label?: string;
};

export function ColorInput({ value, onChange, tokens, label }: ColorInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const cssColor = value ? colorToCSS(value, tokens) : undefined;

  useEffect(() => {
    if (value && "hex" in value) {
      setHexInput(value.hex.replace("#", ""));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleHexSubmit = () => {
    let hex = hexInput.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange({ type: "solid", hex });
    }
  };

  const presetColors = [
    "#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff",
    "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
    "#ec4899", "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#d946ef",
  ];

  const tokenColors = Object.entries(tokens)
    .filter(([, e]) => e.category === "color")
    .slice(0, 24);

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
          {label}
        </div>
      )}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "5px 8px",
          borderRadius: 5,
          border: "1px solid #333",
          background: "#141414",
          color: "#e0e0e0",
          fontSize: 12,
          cursor: "pointer",
          textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: "1px solid #444",
            background: cssColor ?? "repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 0 0 / 8px 8px",
            flexShrink: 0,
          }}
        />
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
          {cssColor ?? "None"}
        </span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 1000,
            width: 240,
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: 10,
            padding: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}
        >
          {/* Hex input */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#888", lineHeight: "28px" }}>
              #
            </span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={handleHexSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
              maxLength={6}
              style={{
                flex: 1,
                padding: "5px 8px",
                borderRadius: 5,
                border: "1px solid #333",
                background: "#141414",
                color: "#e0e0e0",
                fontSize: 12,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
            <input
              type="color"
              value={cssColor?.startsWith("#") ? cssColor : "#000000"}
              onChange={(e) =>
                onChange({ type: "solid", hex: e.target.value })
              }
              style={{
                width: 28,
                height: 28,
                padding: 0,
                border: "1px solid #444",
                borderRadius: 5,
                cursor: "pointer",
                background: "none",
              }}
            />
          </div>

          {/* Opacity slider */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
              <span>Opacity</span>
              <span>{Math.round((value && "opacity" in value ? (value.opacity ?? 1) : 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(
                (value && "opacity" in value ? (value.opacity ?? 1) : 1) * 100
              )}
              onChange={(e) => {
                const opacity = parseInt(e.target.value) / 100;
                if (value && "hex" in value) {
                  onChange({ ...value, opacity });
                }
              }}
              style={{ width: "100%", accentColor: "#4f8eff" }}
            />
          </div>

          {/* Preset colors */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
              Colors
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 3,
              }}
            >
              {presetColors.map((hex) => (
                <button
                  key={hex}
                  onClick={() => onChange({ type: "solid", hex })}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 4,
                    border: cssColor === hex ? "2px solid #4f8eff" : "1px solid #444",
                    background: hex,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Token colors */}
          {tokenColors.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                Tokens
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 3,
                }}
              >
                {tokenColors.map(([path, entry]) => (
                  <button
                    key={path}
                    onClick={() => onChange({ token: path })}
                    title={entry.label ?? path}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: 4,
                      border: "1px solid #444",
                      background: String(entry.value),
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Clear */}
          <button
            onClick={() => {
              onChange(undefined as unknown as Color);
              setIsOpen(false);
            }}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "5px",
              borderRadius: 5,
              border: "1px solid #333",
              background: "transparent",
              color: "#888",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Remove fill
          </button>
        </div>
      )}
    </div>
  );
}
