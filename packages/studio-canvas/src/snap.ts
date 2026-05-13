export type Rect = { x: number; y: number; w: number; h: number };

export type SnapGuide = {
  axis: "x" | "y";
  position: number;
  type: "edge" | "center" | "spacing";
};

export type SnapResult = {
  snappedX: number;
  snappedY: number;
  guides: SnapGuide[];
};

const SNAP_THRESHOLD = 5;

export function computeSnap(
  dragging: Rect,
  siblings: Rect[],
  containerRect?: Rect
): SnapResult {
  const guides: SnapGuide[] = [];
  let snappedX = dragging.x;
  let snappedY = dragging.y;

  const dragCenterX = dragging.x + dragging.w / 2;
  const dragCenterY = dragging.y + dragging.h / 2;
  const dragRight = dragging.x + dragging.w;
  const dragBottom = dragging.y + dragging.h;

  let bestDx = SNAP_THRESHOLD + 1;
  let bestDy = SNAP_THRESHOLD + 1;

  const targets: { edges: number[]; centers: number[]; axis: "x" | "y" }[] = [];

  for (const sib of siblings) {
    targets.push({
      axis: "x",
      edges: [sib.x, sib.x + sib.w],
      centers: [sib.x + sib.w / 2],
    });
    targets.push({
      axis: "y",
      edges: [sib.y, sib.y + sib.h],
      centers: [sib.y + sib.h / 2],
    });
  }

  if (containerRect) {
    targets.push({
      axis: "x",
      edges: [containerRect.x, containerRect.x + containerRect.w],
      centers: [containerRect.x + containerRect.w / 2],
    });
    targets.push({
      axis: "y",
      edges: [containerRect.y, containerRect.y + containerRect.h],
      centers: [containerRect.y + containerRect.h / 2],
    });
  }

  for (const t of targets) {
    if (t.axis === "x") {
      const dragPoints = [dragging.x, dragCenterX, dragRight];
      for (const edge of t.edges) {
        for (const dp of dragPoints) {
          const d = Math.abs(dp - edge);
          if (d < bestDx) {
            bestDx = d;
            snappedX = dragging.x + (edge - dp);
            guides.push({ axis: "x", position: edge, type: "edge" });
          }
        }
      }
      for (const center of t.centers) {
        const d = Math.abs(dragCenterX - center);
        if (d < bestDx) {
          bestDx = d;
          snappedX = dragging.x + (center - dragCenterX);
          guides.push({ axis: "x", position: center, type: "center" });
        }
      }
    } else {
      const dragPoints = [dragging.y, dragCenterY, dragBottom];
      for (const edge of t.edges) {
        for (const dp of dragPoints) {
          const d = Math.abs(dp - edge);
          if (d < bestDy) {
            bestDy = d;
            snappedY = dragging.y + (edge - dp);
            guides.push({ axis: "y", position: edge, type: "edge" });
          }
        }
      }
      for (const center of t.centers) {
        const d = Math.abs(dragCenterY - center);
        if (d < bestDy) {
          bestDy = d;
          snappedY = dragging.y + (center - dragCenterY);
          guides.push({ axis: "y", position: center, type: "center" });
        }
      }
    }
  }

  if (bestDx > SNAP_THRESHOLD) snappedX = dragging.x;
  if (bestDy > SNAP_THRESHOLD) snappedY = dragging.y;

  return {
    snappedX,
    snappedY,
    guides: guides.filter(
      (g) =>
        (g.axis === "x" && bestDx <= SNAP_THRESHOLD) ||
        (g.axis === "y" && bestDy <= SNAP_THRESHOLD)
    ),
  };
}
