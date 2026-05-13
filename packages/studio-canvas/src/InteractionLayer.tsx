"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { NodeId } from "@/packages/studio-schema/src/types";
import {
  screenToDoc,
  computeResize,
  computeRotation,
  normalizeRect,
  rectsIntersect,
  type DragState,
  type HandlePosition,
  type Point,
} from "./interactions";
import { computeSnap, type SnapGuide, type Rect } from "./snap";

/**
 * InteractionLayer: transparent overlay that captures all pointer events
 * for drag, resize, rotate, and marquee operations.
 * Renders on top of the viewport but below the selection overlay.
 */
export function InteractionLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const zoom = useStudio((s) => s.zoom);
  const panX = useStudio((s) => s.panX);
  const panY = useStudio((s) => s.panY);
  const tool = useStudio((s) => s.tool);
  const snapEnabled = useStudio((s) => s.snapEnabled);

  // ── Helpers ──────────────────────────────────────────────────────────

  const getContainerRect = useCallback(() => {
    return containerRef.current?.getBoundingClientRect() ?? new DOMRect();
  }, []);

  const toDocSpace = useCallback(
    (screenX: number, screenY: number): Point => {
      return screenToDoc(screenX, screenY, panX, panY, zoom, getContainerRect());
    },
    [panX, panY, zoom, getContainerRect]
  );

  /**
   * Get bounding rect of a node element in document space
   */
  const getNodeDocRect = useCallback(
    (nodeId: NodeId): Rect | null => {
      const el = document.querySelector(
        `[data-node-id="${nodeId}"]`
      ) as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const containerRect = getContainerRect();
      return {
        x: (rect.left - containerRect.left - panX) / zoom,
        y: (rect.top - containerRect.top - panY) / zoom,
        w: rect.width / zoom,
        h: rect.height / zoom,
      };
    },
    [panX, panY, zoom, getContainerRect]
  );

  /**
   * Get sibling rects for snap computation (same parent, excluding dragged nodes)
   */
  const getSiblingRects = useCallback(
    (nodeIds: NodeId[]): Rect[] => {
      const store = useStudio.getState();
      const rects: Rect[] = [];
      const excludeSet = new Set(nodeIds);

      for (const id of nodeIds) {
        const parent = store.getParent(id);
        if (!parent?.children) continue;
        for (const sibId of parent.children) {
          if (excludeSet.has(sibId)) continue;
          const rect = getNodeDocRect(sibId);
          if (rect) rects.push(rect);
        }
      }
      return rects;
    },
    [getNodeDocRect]
  );

  // ── Hit-test handles ────────────────────────────────────────────────

  const hitTestHandle = useCallback(
    (screenX: number, screenY: number): { nodeId: NodeId; handle: HandlePosition } | null => {
      const store = useStudio.getState();
      const selectedIds = store.selectedIds;
      if (selectedIds.length !== 1) return null;

      const nodeId = selectedIds[0];
      const el = document.querySelector(
        `[data-node-id="${nodeId}"]`
      ) as HTMLElement | null;
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const handleSize = 10; // hit area for handles
      const rotateDistance = 24;

      // Check rotation handle (above top-center)
      const rotatePt = {
        x: rect.left + rect.width / 2,
        y: rect.top - rotateDistance,
      };
      if (
        Math.abs(screenX - rotatePt.x) < handleSize &&
        Math.abs(screenY - rotatePt.y) < handleSize
      ) {
        return { nodeId, handle: "rotate" };
      }

      // Check 8 resize handles
      const handles: Array<{ pos: HandlePosition; x: number; y: number }> = [
        { pos: "top-left", x: rect.left, y: rect.top },
        { pos: "top", x: rect.left + rect.width / 2, y: rect.top },
        { pos: "top-right", x: rect.right, y: rect.top },
        { pos: "right", x: rect.right, y: rect.top + rect.height / 2 },
        { pos: "bottom-right", x: rect.right, y: rect.bottom },
        { pos: "bottom", x: rect.left + rect.width / 2, y: rect.bottom },
        { pos: "bottom-left", x: rect.left, y: rect.bottom },
        { pos: "left", x: rect.left, y: rect.top + rect.height / 2 },
      ];

      for (const h of handles) {
        if (
          Math.abs(screenX - h.x) < handleSize &&
          Math.abs(screenY - h.y) < handleSize
        ) {
          return { nodeId, handle: h.pos };
        }
      }

      return null;
    },
    []
  );

  // ── Hit-test nodes ──────────────────────────────────────────────────

  const hitTestNode = useCallback(
    (screenX: number, screenY: number): NodeId | null => {
      // Use elementsFromPoint to get the topmost node element
      const elements = document.elementsFromPoint(screenX, screenY);
      for (const el of elements) {
        const nodeId = (el as HTMLElement).dataset?.nodeId;
        if (nodeId) {
          // Skip the root node — we don't want to select the page itself
          const store = useStudio.getState();
          if (nodeId === store.document.root) continue;
          return nodeId;
        }
      }
      return null;
    },
    []
  );

  // ── Pointer handlers ────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool !== "select" || e.button !== 0) return;

      const store = useStudio.getState();
      const containerRect = getContainerRect();

      // 1. Check if hitting a handle on the selected node
      const handleHit = hitTestHandle(e.clientX, e.clientY);
      if (handleHit) {
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const docPt = toDocSpace(e.clientX, e.clientY);
        const nodeRect = getNodeDocRect(handleHit.nodeId);
        const node = store.document.nodes[handleHit.nodeId];

        if (handleHit.handle === "rotate") {
          const center: Point = nodeRect
            ? { x: nodeRect.x + nodeRect.w / 2, y: nodeRect.y + nodeRect.h / 2 }
            : docPt;
          dragRef.current = {
            type: "rotate",
            nodeId: handleHit.nodeId,
            handle: handleHit.handle,
            startScreen: { x: e.clientX, y: e.clientY },
            startDoc: docPt,
            currentScreen: { x: e.clientX, y: e.clientY },
            currentDoc: docPt,
            initialRotation: node?.layout.rotation ?? 0,
            rotationCenter: center,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          };
        } else {
          dragRef.current = {
            type: "resize",
            nodeId: handleHit.nodeId,
            handle: handleHit.handle,
            startScreen: { x: e.clientX, y: e.clientY },
            startDoc: docPt,
            currentScreen: { x: e.clientX, y: e.clientY },
            currentDoc: docPt,
            initialRect: nodeRect ?? { x: 0, y: 0, w: 100, h: 100 },
            aspectRatio: nodeRect ? nodeRect.w / nodeRect.h : 1,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          };
        }
        return;
      }

      // 2. Check if hitting a node — start move
      const hitNodeId = hitTestNode(e.clientX, e.clientY);
      if (hitNodeId) {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // Select the node if not already selected
        if (!store.selectedIds.includes(hitNodeId)) {
          store.select([hitNodeId], e.shiftKey || e.metaKey);
        }

        const docPt = toDocSpace(e.clientX, e.clientY);
        const selectedIds = useStudio.getState().selectedIds;
        const initialPositions = new Map<string, { x: number; y: number; w: number; h: number }>();

        for (const id of selectedIds) {
          const rect = getNodeDocRect(id);
          if (rect) initialPositions.set(id, rect);
        }

        dragRef.current = {
          type: "move",
          startScreen: { x: e.clientX, y: e.clientY },
          startDoc: docPt,
          currentScreen: { x: e.clientX, y: e.clientY },
          currentDoc: docPt,
          initialPositions,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        };
        return;
      }

      // 3. Empty space — start marquee selection
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const docPt = toDocSpace(e.clientX, e.clientY);
      dragRef.current = {
        type: "marquee",
        startScreen: { x: e.clientX, y: e.clientY },
        startDoc: docPt,
        currentScreen: { x: e.clientX, y: e.clientY },
        currentDoc: docPt,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      };

      if (!e.shiftKey) {
        store.clearSelection();
      }
    },
    [tool, getContainerRect, hitTestHandle, hitTestNode, toDocSpace, getNodeDocRect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const store = useStudio.getState();
      const docPt = toDocSpace(e.clientX, e.clientY);
      drag.currentScreen = { x: e.clientX, y: e.clientY };
      drag.currentDoc = docPt;
      drag.shiftKey = e.shiftKey;
      drag.altKey = e.altKey;

      const deltaDocX = docPt.x - drag.startDoc.x;
      const deltaDocY = docPt.y - drag.startDoc.y;

      switch (drag.type) {
        case "move": {
          if (!drag.initialPositions) break;
          const selectedIds = store.selectedIds;

          store.transact(
            (nodes) => {
              for (const id of selectedIds) {
                const initial = drag.initialPositions!.get(id);
                const node = nodes[id];
                if (!initial || !node) continue;

                let newX = initial.x + deltaDocX;
                let newY = initial.y + deltaDocY;

                // Constrain to axis if shift is held
                if (drag.shiftKey) {
                  if (Math.abs(deltaDocX) > Math.abs(deltaDocY)) {
                    newY = initial.y;
                  } else {
                    newX = initial.x;
                  }
                }

                // Snap
                if (snapEnabled && selectedIds.length === 1) {
                  const siblings = getSiblingRects(selectedIds);
                  const result = computeSnap(
                    { x: newX, y: newY, w: initial.w, h: initial.h },
                    siblings
                  );
                  newX = result.snappedX;
                  newY = result.snappedY;
                  setActiveGuides(result.guides);
                }

                node.layout.x = Math.round(newX);
                node.layout.y = Math.round(newY);
                // If node was in stack mode, switch to absolute on drag
                if (node.layout.mode !== "absolute") {
                  node.layout.mode = "absolute";
                }
              }
            },
            { coalesceKey: "drag-move", label: "Move" }
          );
          break;
        }

        case "resize": {
          if (!drag.initialRect || !drag.handle || !drag.nodeId) break;
          const newRect = computeResize(
            drag.handle,
            drag.initialRect,
            deltaDocX,
            deltaDocY,
            drag.shiftKey,
            drag.altKey
          );

          store.transact(
            (nodes) => {
              const node = nodes[drag.nodeId!];
              if (!node) return;
              node.layout.x = newRect.x;
              node.layout.y = newRect.y;
              node.layout.w = newRect.w;
              node.layout.h = newRect.h;
              if (node.layout.mode !== "absolute") {
                node.layout.mode = "absolute";
              }
            },
            { coalesceKey: "drag-resize", label: "Resize" }
          );
          break;
        }

        case "rotate": {
          if (!drag.rotationCenter || !drag.nodeId) break;
          const angle = computeRotation(
            drag.rotationCenter,
            docPt,
            drag.initialRotation ?? 0,
            drag.shiftKey // snap to 15-degree increments
          );

          store.transact(
            (nodes) => {
              const node = nodes[drag.nodeId!];
              if (!node) return;
              node.layout.rotation = angle;
            },
            { coalesceKey: "drag-rotate", label: "Rotate" }
          );
          break;
        }

        case "marquee": {
          const x = Math.min(drag.startDoc.x, docPt.x);
          const y = Math.min(drag.startDoc.y, docPt.y);
          const w = Math.abs(docPt.x - drag.startDoc.x);
          const h = Math.abs(docPt.y - drag.startDoc.y);
          const rect = normalizeRect(x, y, w, h);
          setMarqueeRect(rect);

          // Find nodes that intersect the marquee
          const root = store.document.nodes[store.document.root];
          if (root?.children) {
            const hitIds: NodeId[] = [];
            for (const childId of root.children) {
              const childRect = getNodeDocRect(childId);
              if (childRect && rectsIntersect(rect, childRect)) {
                hitIds.push(childId);
              }
            }
            store.select(hitIds);
          }
          break;
        }
      }
    },
    [toDocSpace, snapEnabled, getSiblingRects, getNodeDocRect]
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;

    dragRef.current = null;
    setActiveGuides([]);
    setMarqueeRect(null);
  }, []);

  // ── Cursor logic ────────────────────────────────────────────────────

  const [cursor, setCursor] = useState("default");

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) return;
      if (tool !== "select") return;

      // Check handles first
      const handleHit = hitTestHandle(e.clientX, e.clientY);
      if (handleHit) {
        if (handleHit.handle === "rotate") {
          setCursor("grab");
        } else {
          const node = useStudio.getState().document.nodes[handleHit.nodeId];
          const rotation = node?.layout.rotation ?? 0;
          const cursorMap: Record<string, string> = {
            "top-left": "nwse-resize",
            "top": "ns-resize",
            "top-right": "nesw-resize",
            "right": "ew-resize",
            "bottom-right": "nwse-resize",
            "bottom": "ns-resize",
            "bottom-left": "nesw-resize",
            "left": "ew-resize",
          };
          setCursor(cursorMap[handleHit.handle] ?? "default");
        }
        return;
      }

      // Check if over a node
      const hitNodeId = hitTestNode(e.clientX, e.clientY);
      if (hitNodeId) {
        setCursor("default");
        return;
      }

      setCursor("default");
    },
    [tool, hitTestHandle, hitTestNode]
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        cursor,
        // Only intercept pointer events when we have the select tool
        pointerEvents: tool === "select" ? "auto" : "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseMove={handleMouseMove}
    >
      {/* Snap guides */}
      {activeGuides.length > 0 && (
        <SnapGuidesRenderer guides={activeGuides} />
      )}

      {/* Marquee selection rectangle */}
      {marqueeRect && (
        <MarqueeRenderer rect={marqueeRect} />
      )}
    </div>
  );
}

// ── Snap Guides Renderer ──────────────────────────────────────────────

function SnapGuidesRenderer({ guides }: { guides: SnapGuide[] }) {
  const zoom = useStudio((s) => s.zoom);
  const panX = useStudio((s) => s.panX);
  const panY = useStudio((s) => s.panY);

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {guides.map((guide, i) => {
        if (guide.axis === "x") {
          const screenX = guide.position * zoom + panX;
          return (
            <line
              key={`x-${i}`}
              x1={screenX}
              y1={0}
              x2={screenX}
              y2="100%"
              stroke="#ff4f8e"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        } else {
          const screenY = guide.position * zoom + panY;
          return (
            <line
              key={`y-${i}`}
              x1={0}
              y1={screenY}
              x2="100%"
              y2={screenY}
              stroke="#ff4f8e"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        }
      })}
    </svg>
  );
}

// ── Marquee Renderer ──────────────────────────────────────────────────

function MarqueeRenderer({
  rect,
}: {
  rect: { x: number; y: number; w: number; h: number };
}) {
  const zoom = useStudio((s) => s.zoom);
  const panX = useStudio((s) => s.panX);
  const panY = useStudio((s) => s.panY);

  const screenX = rect.x * zoom + panX;
  const screenY = rect.y * zoom + panY;
  const screenW = rect.w * zoom;
  const screenH = rect.h * zoom;

  return (
    <div
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        border: "1px solid #4f8eff",
        background: "rgba(79, 142, 255, 0.08)",
        pointerEvents: "none",
      }}
    />
  );
}
