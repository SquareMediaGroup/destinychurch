"use client";

import React, { useState } from "react";
import type { SizeValue } from "@/packages/studio-schema/src/types";

type UnitInputProps = {
  value: SizeValue | undefined;
  onChange: (value: SizeValue) => void;
  label?: string;
  allowAuto?: boolean;
  allowFill?: boolean;
  allowPercent?: boolean;
};

const UNIT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "px", value: "px" },
  { label: "%", value: "%" },
  { label: "auto", value: "auto" },
  { label: "fill", value: "fill" },
];

export function UnitInput({
  value,
  onChange,
  label,
  allowAuto = true,
  allowFill = true,
  allowPercent = true,
}: UnitInputProps) {
  const getUnit = (): string => {
    if (value === "auto") return "auto";
    if (value === "fill") return "fill";
    if (typeof value === "string" && value.endsWith("%")) return "%";
    return "px";
  };

  const getNumericValue = (): string => {
    if (value === undefined || value === "auto" || value === "fill") return "";
    if (typeof value === "string" && value.endsWith("%"))
      return value.replace("%", "");
    return String(value);
  };

  const [unit, setUnit] = useState(getUnit());

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    if (isNaN(num)) return;
    if (unit === "%") {
      onChange(`${num}%` as SizeValue);
    } else {
      onChange(num);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    if (newUnit === "auto") {
      onChange("auto");
    } else if (newUnit === "fill") {
      onChange("fill");
    } else {
      const num = parseFloat(getNumericValue()) || 0;
      if (newUnit === "%") {
        onChange(`${num}%` as SizeValue);
      } else {
        onChange(num);
      }
    }
  };

  const isKeyword = unit === "auto" || unit === "fill";

  const filteredOptions = UNIT_OPTIONS.filter((o) => {
    if (o.value === "auto" && !allowAuto) return false;
    if (o.value === "fill" && !allowFill) return false;
    if (o.value === "%" && !allowPercent) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, color: "#888" }}>{label}</label>
      )}
      <div style={{ display: "flex", gap: 2 }}>
        <input
          type="text"
          inputMode="numeric"
          value={isKeyword ? unit : getNumericValue()}
          onChange={handleNumericChange}
          disabled={isKeyword}
          style={{
            flex: 1,
            padding: "5px 8px",
            borderRadius: "5px 0 0 5px",
            border: "1px solid #333",
            borderRight: "none",
            background: "#141414",
            color: isKeyword ? "#666" : "#e0e0e0",
            fontSize: 12,
            outline: "none",
            fontVariantNumeric: "tabular-nums",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        />
        <select
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          style={{
            padding: "5px 4px",
            borderRadius: "0 5px 5px 0",
            border: "1px solid #333",
            background: "#1a1a1a",
            color: "#888",
            fontSize: 10,
            outline: "none",
            cursor: "pointer",
            width: 42,
          }}
        >
          {filteredOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
