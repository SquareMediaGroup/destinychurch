import type {
  NodeStyle,
  TokenSet,
  Breakpoint,
  StudioNode,
  Shadow,
} from "@/packages/studio-schema/src/types";
import { colorToCSS, resolveTokenOrLiteral, isTokenRef } from "@/packages/studio-tokens/src/resolve";

function shadowToCSS(shadow: Shadow): string {
  const inset = shadow.inset ? "inset " : "";
  const opacity = shadow.opacity ?? 1;
  const r = parseInt(shadow.color.slice(1, 3), 16);
  const g = parseInt(shadow.color.slice(3, 5), 16);
  const b = parseInt(shadow.color.slice(5, 7), 16);
  return `${inset}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function resolveNodeStyle(
  style: NodeStyle,
  tokens: TokenSet,
  breakpoint: Breakpoint,
  responsive?: StudioNode["responsive"]
): React.CSSProperties {
  const merged = { ...style };

  if (responsive && breakpoint !== "base") {
    const bpOverride = responsive[breakpoint]?.style;
    if (bpOverride) {
      Object.assign(merged, bpOverride);
    }
  }

  const css: React.CSSProperties = {};

  const fill = colorToCSS(merged.fill, tokens);
  if (fill) {
    if (fill.startsWith("linear-gradient") || fill.startsWith("radial-gradient")) {
      css.backgroundImage = fill;
    } else {
      css.backgroundColor = fill;
    }
  }

  const textColor = colorToCSS(merged.color, tokens);
  if (textColor) css.color = textColor;

  const stroke = colorToCSS(merged.stroke, tokens);
  if (stroke) {
    css.borderColor = stroke;
    css.borderWidth = merged.strokeWidth ?? 1;
    css.borderStyle = merged.strokeStyle ?? "solid";
  }

  if (merged.radius !== undefined) {
    if (Array.isArray(merged.radius)) {
      css.borderRadius = merged.radius.map((r) => `${r}px`).join(" ");
    } else {
      css.borderRadius = merged.radius;
    }
  }

  if (merged.shadow?.length) {
    css.boxShadow = merged.shadow.map(shadowToCSS).join(", ");
  }
  if (merged.innerShadow?.length) {
    const existing = css.boxShadow ? css.boxShadow + ", " : "";
    css.boxShadow = existing + merged.innerShadow.map((s) => shadowToCSS({ ...s, inset: true })).join(", ");
  }

  if (merged.blur !== undefined) {
    css.filter = `blur(${merged.blur}px)`;
  }
  if (merged.backgroundBlur !== undefined) {
    css.backdropFilter = `blur(${merged.backgroundBlur}px)`;
  }

  if (merged.opacity !== undefined) css.opacity = merged.opacity;
  if (merged.mixBlendMode) css.mixBlendMode = merged.mixBlendMode as React.CSSProperties["mixBlendMode"];
  if (merged.overflow) css.overflow = merged.overflow;
  if (merged.cursor) css.cursor = merged.cursor;
  if (merged.transition) css.transition = merged.transition;

  if (merged.font) {
    const family = resolveTokenOrLiteral(tokens, merged.font.family);
    if (family) css.fontFamily = family;
    if (merged.font.size !== undefined) css.fontSize = merged.font.size;
    if (merged.font.weight !== undefined) css.fontWeight = merged.font.weight;
    if (merged.font.lineHeight !== undefined) css.lineHeight = merged.font.lineHeight;
    if (merged.font.letterSpacing !== undefined) css.letterSpacing = merged.font.letterSpacing;
    if (merged.font.textAlign) css.textAlign = merged.font.textAlign;
    if (merged.font.textDecoration) css.textDecoration = merged.font.textDecoration;
    if (merged.font.textTransform) css.textTransform = merged.font.textTransform;
    if (merged.font.fontStyle) css.fontStyle = merged.font.fontStyle;
  }

  return css;
}
