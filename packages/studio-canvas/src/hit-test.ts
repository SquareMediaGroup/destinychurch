import type { NodeId, StudioNode } from "@/packages/studio-schema/src/types";

/**
 * DOM-based hit-testing. Uses elementsFromPoint for accurate hit detection
 * that respects z-order, overflow, and visibility.
 *
 * For Phase 8+ (1000+ nodes), replace this with an rbush spatial index
 * operating on document-space bounding boxes.
 */

export type HitResult = {
  nodeId: NodeId;
  depth: number; // tree depth, 0 = root children
};

/**
 * Find the deepest node at screen coordinates.
 * Skips the root frame. Returns null if no node hit.
 */
export function hitTestAtPoint(
  screenX: number,
  screenY: number,
  rootId: NodeId
): HitResult | null {
  const elements = document.elementsFromPoint(screenX, screenY);

  for (const el of elements) {
    const htmlEl = el as HTMLElement;
    const nodeId = htmlEl.dataset?.nodeId;
    if (!nodeId || nodeId === rootId) continue;

    // Walk up to count depth
    let depth = 0;
    let parent = htmlEl.parentElement;
    while (parent) {
      if (parent.dataset?.nodeId) depth++;
      parent = parent.parentElement;
    }

    return { nodeId, depth };
  }

  return null;
}

/**
 * Find all nodes under a rectangle (for marquee selection).
 * Only tests direct children of the specified parent.
 */
export function hitTestInRect(
  rect: { x: number; y: number; w: number; h: number },
  parentId: NodeId,
  nodes: Record<NodeId, StudioNode>,
  getElementRect: (id: NodeId) => DOMRect | null
): NodeId[] {
  const parent = nodes[parentId];
  if (!parent?.children) return [];

  const hits: NodeId[] = [];

  for (const childId of parent.children) {
    const elRect = getElementRect(childId);
    if (!elRect) continue;

    // Convert element rect to same coordinate system as input rect
    const childRect = {
      x: elRect.left,
      y: elRect.top,
      w: elRect.width,
      h: elRect.height,
    };

    // Check intersection
    const intersects = !(
      childRect.x + childRect.w < rect.x ||
      rect.x + rect.w < childRect.x ||
      childRect.y + childRect.h < rect.y ||
      rect.y + rect.h < childRect.y
    );

    if (intersects) hits.push(childId);
  }

  return hits;
}

/**
 * Deep-select: alt-click drills into groups.
 * Given a screen position, returns increasingly deeper nodes.
 */
export function deepHitTest(
  screenX: number,
  screenY: number,
  rootId: NodeId,
  currentSelectedId?: NodeId
): NodeId | null {
  const elements = document.elementsFromPoint(screenX, screenY);

  const nodeIds: NodeId[] = [];
  for (const el of elements) {
    const nodeId = (el as HTMLElement).dataset?.nodeId;
    if (nodeId && nodeId !== rootId) {
      nodeIds.push(nodeId);
    }
  }

  if (nodeIds.length === 0) return null;

  // If nothing is currently selected, return the topmost
  if (!currentSelectedId) return nodeIds[0];

  // Find the current selection in the stack
  const idx = nodeIds.indexOf(currentSelectedId);
  if (idx === -1) return nodeIds[0];

  // Return the next deeper node (or loop back to top)
  return nodeIds[(idx + 1) % nodeIds.length] ?? nodeIds[0];
}
