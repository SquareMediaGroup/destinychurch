import type {
  NodeLayout,
  SizeValue,
  Breakpoint,
  StudioNode,
} from "@/packages/studio-schema/src/types";

function sizeToCSS(value: SizeValue | undefined): string | number | undefined {
  if (value === undefined) return undefined;
  if (value === "auto") return "auto";
  if (value === "fill") return "100%";
  if (typeof value === "string") {
    if (value.endsWith("%")) return value;
    if (value.endsWith("fr")) return value;
    return value;
  }
  return value;
}

export function resolveNodeLayout(
  layout: NodeLayout,
  breakpoint: Breakpoint,
  responsive?: StudioNode["responsive"]
): React.CSSProperties {
  const merged = { ...layout };

  if (responsive && breakpoint !== "base") {
    const bpOverride = responsive[breakpoint]?.layout;
    if (bpOverride) {
      Object.assign(merged, bpOverride);
    }
  }

  const css: React.CSSProperties = {};

  // Position
  if (merged.mode === "absolute") {
    css.position = "absolute";
    if (merged.x !== undefined) css.left = merged.x;
    if (merged.y !== undefined) css.top = merged.y;
  }

  // Size
  const w = sizeToCSS(merged.w);
  const h = sizeToCSS(merged.h);
  if (w !== undefined) css.width = w;
  if (h !== undefined) css.height = h;
  if (merged.minW !== undefined) css.minWidth = merged.minW;
  if (merged.maxW !== undefined) css.maxWidth = merged.maxW;
  if (merged.minH !== undefined) css.minHeight = merged.minH;
  if (merged.maxH !== undefined) css.maxHeight = merged.maxH;

  // Rotation
  if (merged.rotation) {
    css.transform = `rotate(${merged.rotation}deg)`;
  }

  // Flex/Grid layout for children
  if (merged.mode === "stack") {
    css.display = "flex";
    css.flexDirection = merged.direction === "row" ? "row" : "column";
    if (merged.wrap) css.flexWrap = "wrap";
    if (merged.gap !== undefined) css.gap = merged.gap;
    if (merged.alignItems) {
      const map: Record<string, string> = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
        stretch: "stretch",
        baseline: "baseline",
      };
      css.alignItems = map[merged.alignItems] ?? merged.alignItems;
    }
    if (merged.justifyContent) {
      const map: Record<string, string> = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
        between: "space-between",
        around: "space-around",
        evenly: "space-evenly",
      };
      css.justifyContent = map[merged.justifyContent] ?? merged.justifyContent;
    }
  }

  if (merged.mode === "grid") {
    css.display = "grid";
    if (merged.columns) {
      css.gridTemplateColumns = `repeat(${merged.columns}, 1fr)`;
    }
    if (merged.rows) {
      css.gridTemplateRows = `repeat(${merged.rows}, 1fr)`;
    }
    if (merged.gap !== undefined) css.gap = merged.gap;
    if (merged.rowGap !== undefined) css.rowGap = merged.rowGap;
    if (merged.colGap !== undefined) css.columnGap = merged.colGap;
  }

  // Padding
  if (merged.padding) {
    css.padding = merged.padding.map((p) => `${p}px`).join(" ");
  }

  // Self alignment
  if (merged.alignSelf) {
    const map: Record<string, string> = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      stretch: "stretch",
    };
    css.alignSelf = map[merged.alignSelf] ?? merged.alignSelf;
  }
  if (merged.grow !== undefined) css.flexGrow = merged.grow;
  if (merged.shrink !== undefined) css.flexShrink = merged.shrink;
  if (merged.order !== undefined) css.order = merged.order;
  if (merged.zIndex !== undefined) css.zIndex = merged.zIndex;

  return css;
}
