"use client";

import React, { useState, useRef, useCallback } from "react";

type NumberInputProps = {
  value: number | undefined;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function NumberInput({
  value,
  onChange,
  label,
  min,
  max,
  step = 1,
  suffix,
  placeholder,
  disabled,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState<string>(
    value !== undefined ? String(value) : ""
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);
  const labelRef = useRef<HTMLLabelElement>(null);

  const clamp = useCallback(
    (v: number) => {
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      return v;
    },
    [min, max]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      const clamped = clamp(parsed);
      onChange(clamped);
      setLocalValue(String(clamped));
    } else if (value !== undefined) {
      setLocalValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.shiftKey ? step * 10 : step;
      const current = value ?? 0;
      const next = clamp(
        e.key === "ArrowUp" ? current + delta : current - delta
      );
      onChange(next);
      setLocalValue(String(next));
    }
  };

  // Scrubbable label
  const handleLabelPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartValue.current = value ?? 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "ew-resize";
  };

  const handleLabelPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX.current;
    const sensitivity = e.shiftKey ? 0.1 : 1;
    const delta = Math.round(dx * sensitivity) * step;
    const next = clamp(dragStartValue.current + delta);
    onChange(next);
    setLocalValue(String(next));
  };

  const handleLabelPointerUp = () => {
    setIsDragging(false);
    document.body.style.cursor = "";
  };

  React.useEffect(() => {
    if (value !== undefined && !isDragging) {
      setLocalValue(String(value));
    }
  }, [value, isDragging]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label
          ref={labelRef}
          onPointerDown={handleLabelPointerDown}
          onPointerMove={handleLabelPointerMove}
          onPointerUp={handleLabelPointerUp}
          style={{
            fontSize: 11,
            color: "#888",
            cursor: disabled ? "default" : "ew-resize",
            userSelect: "none",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <input
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "5px 8px",
            borderRadius: 5,
            border: "1px solid #333",
            background: "#141414",
            color: "#e0e0e0",
            fontSize: 12,
            outline: "none",
            fontVariantNumeric: "tabular-nums",
            boxSizing: "border-box",
          }}
        />
        {suffix && (
          <span style={{ fontSize: 10, color: "#666", flexShrink: 0 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
