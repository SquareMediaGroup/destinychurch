"use client";

import React, { Suspense, lazy, useMemo } from "react";
import type { IconRef } from "@/packages/studio-schema/src/types";

type IconProps = {
  icon: IconRef;
  className?: string;
  style?: React.CSSProperties;
};

const phosphorCache = new Map<string, React.LazyExoticComponent<React.ComponentType<{ size?: number; weight?: string; color?: string }>>>();

function getPhosphorIcon(name: string) {
  if (!phosphorCache.has(name)) {
    phosphorCache.set(
      name,
      lazy(() =>
        import("@phosphor-icons/react").then((mod) => {
          const iconName = name
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("");
          const Component = (mod as unknown as Record<string, React.ComponentType<Record<string, unknown>>>)[iconName];
          if (!Component) {
            return { default: () => <span title={`Icon not found: ${name}`}>?</span> } as { default: React.ComponentType };
          }
          return { default: Component as React.ComponentType<{ size?: number; weight?: string; color?: string }> };
        })
      )
    );
  }
  return phosphorCache.get(name)!;
}

export function StudioIcon({ icon, className, style }: IconProps) {
  const size = icon.size ?? 24;

  if (icon.lib === "material") {
    return (
      <span
        className={`material-symbols-rounded ${className ?? ""}`}
        style={{
          fontSize: size,
          lineHeight: 1,
          fontVariationSettings: icon.filled ? "'FILL' 1" : undefined,
          userSelect: "none",
          ...style,
        }}
      >
        {icon.name}
      </span>
    );
  }

  if (icon.lib === "phosphor") {
    const PhosphorIcon = getPhosphorIcon(icon.name);
    return (
      <Suspense
        fallback={
          <span
            style={{ width: size, height: size, display: "inline-block" }}
          />
        }
      >
        <PhosphorIcon
          size={size}
          weight={icon.weight ?? "regular"}
        />
      </Suspense>
    );
  }

  return null;
}
