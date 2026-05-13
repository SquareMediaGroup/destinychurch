"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";

/**
 * SelectionOverlay: renders selection boxes, resize handles, and rotation grip
 * on a canvas overlay. This is display-only — interaction is handled by InteractionLayer.
 */
export function SelectionOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedIds = useStudio((s) => s.selectedIds);
  const hoveredId = useStudio((s) => s.hoveredId);
  const editingId = useStudio((s) => s.editingId);
  const zoom = useStudio((s) => s.zoom);
  const panX = useStudio((s) => s.panX);
  const panY = useStudio((s) => s.panY);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerRect = canvas.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerRect.width * dpr;
    canvas.height = containerRect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, containerRect.width, containerRect.height);

    const HANDLE_SIZE = 7;
    const HANDLE_BORDER = 1.5;
    const ROTATE_DISTANCE = 24;
    const ROTATE_RADIUS = 4;

    // ── Draw selection boxes & handles ──────────────────────────────

    for (const id of selectedIds) {
      if (id === editingId) continue; // don't show handles while inline-editing

      const el = document.querySelector(
        `[data-node-id="${id}"]`
      ) as HTMLElement | null;
      if (!el) continue;
      const elRect = el.getBoundingClientRect();
      const x = elRect.left - containerRect.left;
      const y = elRect.top - containerRect.top;
      const w = elRect.width;
      const h = elRect.height;

      // Selection border
      ctx.strokeStyle = "#4f8eff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      // Dimension label
      if (selectedIds.length === 1) {
        const nodeW = Math.round(w / zoom);
        const nodeH = Math.round(h / zoom);
        const dimText = `${nodeW} x ${nodeH}`;
        ctx.font = "10px -apple-system, system-ui, sans-serif";
        const textMetrics = ctx.measureText(dimText);
        const textW = textMetrics.width + 8;
        const textH = 16;
        const textX = x + w / 2 - textW / 2;
        const textY = y + h + 6;

        ctx.fillStyle = "#4f8eff";
        ctx.beginPath();
        ctx.roundRect(textX, textY, textW, textH, 3);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(dimText, x + w / 2, textY + textH / 2);
      }

      // Resize handles (8 points)
      const handles: Array<[number, number]> = [
        [x, y],
        [x + w / 2, y],
        [x + w, y],
        [x + w, y + h / 2],
        [x + w, y + h],
        [x + w / 2, y + h],
        [x, y + h],
        [x, y + h / 2],
      ];

      for (const [hx, hy] of handles) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#4f8eff";
        ctx.lineWidth = HANDLE_BORDER;
        ctx.fillRect(
          hx - HANDLE_SIZE / 2,
          hy - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
        ctx.strokeRect(
          hx - HANDLE_SIZE / 2,
          hy - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
      }

      // Rotation handle (circle above top-center)
      if (selectedIds.length === 1) {
        const rx = x + w / 2;
        const ry = y - ROTATE_DISTANCE;

        // Connector line
        ctx.strokeStyle = "#4f8eff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        // Circle
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#4f8eff";
        ctx.lineWidth = HANDLE_BORDER;
        ctx.beginPath();
        ctx.arc(rx, ry, ROTATE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotation icon (small arc arrow inside)
        ctx.strokeStyle = "#4f8eff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rx, ry, 2.5, -Math.PI * 0.3, Math.PI * 1.2);
        ctx.stroke();
      }
    }

    // ── Multi-selection bounding box ────────────────────────────────

    if (selectedIds.length > 1) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      for (const id of selectedIds) {
        const el = document.querySelector(
          `[data-node-id="${id}"]`
        ) as HTMLElement | null;
        if (!el) continue;
        const r = el.getBoundingClientRect();
        minX = Math.min(minX, r.left - containerRect.left);
        minY = Math.min(minY, r.top - containerRect.top);
        maxX = Math.max(maxX, r.right - containerRect.left);
        maxY = Math.max(maxY, r.bottom - containerRect.top);
      }

      if (minX < Infinity) {
        ctx.strokeStyle = "rgba(79, 142, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);

        // Count label
        const countText = `${selectedIds.length} selected`;
        ctx.font = "10px -apple-system, system-ui, sans-serif";
        const tm = ctx.measureText(countText);
        const tw = tm.width + 8;
        const th = 16;
        const tx = minX + (maxX - minX) / 2 - tw / 2;
        const ty = maxY + 6;

        ctx.fillStyle = "rgba(79, 142, 255, 0.8)";
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 3);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(countText, minX + (maxX - minX) / 2, ty + th / 2);
      }
    }

    // ── Hover highlight ────────────────────────────────────────────

    if (hoveredId && !selectedIds.includes(hoveredId) && hoveredId !== editingId) {
      const el = document.querySelector(
        `[data-node-id="${hoveredId}"]`
      ) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        ctx.strokeStyle = "rgba(79, 142, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          r.left - containerRect.left,
          r.top - containerRect.top,
          r.width,
          r.height
        );

        // Hover label
        const node = useStudio.getState().document.nodes[hoveredId];
        if (node) {
          const labelText = node.name || node.type;
          ctx.font = "10px -apple-system, system-ui, sans-serif";
          const lm = ctx.measureText(labelText);
          const lw = lm.width + 6;
          const lh = 14;
          const lx = r.left - containerRect.left;
          const ly = r.top - containerRect.top - lh - 2;

          ctx.fillStyle = "rgba(79, 142, 255, 0.7)";
          ctx.beginPath();
          ctx.roundRect(lx, ly, lw, lh, 2);
          ctx.fill();

          ctx.fillStyle = "#fff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(labelText, lx + 3, ly + lh / 2);
        }
      }
    }

    // ── Distance guides (when dragging near siblings) ──────────────
    // Drawn by InteractionLayer's SnapGuidesRenderer instead
  }, [selectedIds, hoveredId, editingId, zoom, panX, panY]);

  // Redraw on RAF loop when selection exists
  useEffect(() => {
    if (selectedIds.length === 0 && !hoveredId) return;
    let raf: number;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, selectedIds, hoveredId]);

  // Initial draw & resize observer
  useEffect(() => {
    draw();
    const observer = new ResizeObserver(() => draw());
    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 998, // below InteractionLayer (z-index 100), but above canvas
      }}
    />
  );
}
