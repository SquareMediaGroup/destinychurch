// Interaction utilities for canvas manipulation
// Coordinate transform helpers between screen space and document space

export type Point = { x: number; y: number };

export type HandlePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"
  | "rotate";

export type DragState = {
  type: "move" | "resize" | "rotate" | "marquee" | "create";
  nodeId?: string;
  handle?: HandlePosition;
  startScreen: Point;
  startDoc: Point;
  currentScreen: Point;
  currentDoc: Point;
  // For move: original node positions
  initialPositions?: Map<string, { x: number; y: number; w: number; h: number }>;
  // For resize
  initialRect?: { x: number; y: number; w: number; h: number };
  aspectRatio?: number;
  // For rotate
  initialRotation?: number;
  rotationCenter?: Point;
  // Modifiers
  shiftKey: boolean;
  altKey: boolean;
};

/**
 * Convert screen coordinates to document space
 */
export function screenToDoc(
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number,
  containerRect: DOMRect
): Point {
  return {
    x: (screenX - containerRect.left - panX) / zoom,
    y: (screenY - containerRect.top - panY) / zoom,
  };
}

/**
 * Convert document coordinates to screen space
 */
export function docToScreen(
  docX: number,
  docY: number,
  panX: number,
  panY: number,
  zoom: number,
  containerRect: DOMRect
): Point {
  return {
    x: docX * zoom + panX + containerRect.left,
    y: docY * zoom + panY + containerRect.top,
  };
}

/**
 * Get cursor style for a resize handle
 */
export function getHandleCursor(handle: HandlePosition, rotation: number = 0): string {
  const cursors: Record<HandlePosition, number> = {
    "top-left": 315,
    "top": 0,
    "top-right": 45,
    "right": 90,
    "bottom-right": 135,
    "bottom": 180,
    "bottom-left": 225,
    "left": 270,
    "rotate": 0,
  };

  if (handle === "rotate") return "grab";

  const angle = ((cursors[handle] + rotation) % 360 + 360) % 360;

  // Map angle to cursor direction
  if (angle >= 337.5 || angle < 22.5) return "n-resize";
  if (angle >= 22.5 && angle < 67.5) return "ne-resize";
  if (angle >= 67.5 && angle < 112.5) return "e-resize";
  if (angle >= 112.5 && angle < 157.5) return "se-resize";
  if (angle >= 157.5 && angle < 202.5) return "s-resize";
  if (angle >= 202.5 && angle < 247.5) return "sw-resize";
  if (angle >= 247.5 && angle < 292.5) return "w-resize";
  return "nw-resize";
}

/**
 * Compute new rect after a resize operation
 */
export function computeResize(
  handle: HandlePosition,
  initial: { x: number; y: number; w: number; h: number },
  deltaX: number,
  deltaY: number,
  lockAspect: boolean,
  fromCenter: boolean
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = initial;
  const aspectRatio = initial.w / initial.h;

  switch (handle) {
    case "top-left":
      x += deltaX;
      y += deltaY;
      w -= deltaX;
      h -= deltaY;
      break;
    case "top":
      y += deltaY;
      h -= deltaY;
      break;
    case "top-right":
      y += deltaY;
      w += deltaX;
      h -= deltaY;
      break;
    case "right":
      w += deltaX;
      break;
    case "bottom-right":
      w += deltaX;
      h += deltaY;
      break;
    case "bottom":
      h += deltaY;
      break;
    case "bottom-left":
      x += deltaX;
      w -= deltaX;
      h += deltaY;
      break;
    case "left":
      x += deltaX;
      w -= deltaX;
      break;
  }

  // Enforce minimum size
  if (w < 10) { w = 10; if (handle.includes("left")) x = initial.x + initial.w - 10; }
  if (h < 10) { h = 10; if (handle.includes("top")) y = initial.y + initial.h - 10; }

  // Lock aspect ratio (shift held)
  if (lockAspect) {
    if (handle === "top" || handle === "bottom") {
      w = h * aspectRatio;
    } else if (handle === "left" || handle === "right") {
      h = w / aspectRatio;
    } else {
      // Corner handles: use the dominant axis
      const newAspect = w / h;
      if (newAspect > aspectRatio) {
        w = h * aspectRatio;
      } else {
        h = w / aspectRatio;
      }
    }
  }

  // Resize from center (alt held)
  if (fromCenter) {
    const cx = initial.x + initial.w / 2;
    const cy = initial.y + initial.h / 2;
    x = cx - w / 2;
    y = cy - h / 2;
  }

  return { x, y, w: Math.round(w), h: Math.round(h) };
}

/**
 * Compute rotation angle from pointer position relative to center
 */
export function computeRotation(
  center: Point,
  current: Point,
  initialRotation: number,
  snapTo15: boolean
): number {
  const angle = Math.atan2(current.y - center.y, current.x - center.x);
  let degrees = (angle * 180) / Math.PI + 90; // +90 because rotation starts from top
  degrees = ((degrees % 360) + 360) % 360;

  if (snapTo15) {
    degrees = Math.round(degrees / 15) * 15;
  }

  return degrees;
}

/**
 * Check if a point is within a rect
 */
export function pointInRect(point: Point, rect: { x: number; y: number; w: number; h: number }): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

/**
 * Check if two rects intersect (for marquee selection)
 */
export function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

/**
 * Normalize a rect (handle negative w/h from backwards marquee)
 */
export function normalizeRect(x: number, y: number, w: number, h: number) {
  return {
    x: w < 0 ? x + w : x,
    y: h < 0 ? y + h : y,
    w: Math.abs(w),
    h: Math.abs(h),
  };
}
