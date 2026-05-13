"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";

export function SelectionOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedIds = useStudio((s) => s.selectedIds);
  const hoveredId = useStudio((s) => s.hoveredId);
  const zoom = useStudio((s) => s.zoom);
  const panX = useStudio((s) => s.panX);
  const panY = useStudio((s) => s.panY);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw selection boxes
    for (const id of selectedIds) {
      const el = document.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
      if (!el) continue;
      const elRect = el.getBoundingClientRect();
      const x = elRect.left - rect.left;
      const y = elRect.top - rect.top;

      ctx.strokeStyle = "#4f8eff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, elRect.width, elRect.height);

      // Resize handles
      const handleSize = 7;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#4f8eff";
      ctx.lineWidth = 1.5;

      const handles = [
        [x, y],
        [x + elRect.width / 2, y],
        [x + elRect.width, y],
        [x + elRect.width, y + elRect.height / 2],
        [x + elRect.width, y + elRect.height],
        [x + elRect.width / 2, y + elRect.height],
        [x, y + elRect.height],
        [x, y + elRect.height / 2],
      ];

      for (const [hx, hy] of handles) {
        ctx.fillRect(
          hx - handleSize / 2,
          hy - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.strokeRect(
          hx - handleSize / 2,
          hy - handleSize / 2,
          handleSize,
          handleSize
        );
      }
    }

    // Hover highlight
    if (hoveredId && !selectedIds.includes(hoveredId)) {
      const el = document.querySelector(`[data-node-id="${hoveredId}"]`) as HTMLElement | null;
      if (el) {
        const elRect = el.getBoundingClientRect();
        ctx.strokeStyle = "rgba(79, 142, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          elRect.left - rect.left,
          elRect.top - rect.top,
          elRect.width,
          elRect.height
        );
      }
    }
  }, [selectedIds, hoveredId, zoom, panX, panY]);

  useEffect(() => {
    draw();
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [draw]);

  useEffect(() => {
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
        zIndex: 999,
      }}
    />
  );
}
