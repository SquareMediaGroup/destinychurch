"use client";

import React, { useRef, useCallback, useEffect, type ReactNode } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";

type ViewportProps = {
  children: ReactNode;
  className?: string;
};

export function Viewport({ children, className }: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  const zoom = useStudio((s) => s.zoom);
  const panX = useStudio((s) => s.panX);
  const panY = useStudio((s) => s.panY);
  const tool = useStudio((s) => s.tool);
  const setZoom = useStudio((s) => s.setZoom);
  const setPan = useStudio((s) => s.setPan);

  const isHandTool = tool === "hand" || spaceHeld.current;

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = Math.max(0.1, Math.min(8, zoom * factor));
        const scale = newZoom / zoom;
        const newPanX = mx - scale * (mx - panX);
        const newPanY = my - scale * (my - panY);
        setZoom(newZoom);
        setPan(newPanX, newPanY);
      } else {
        setPan(panX - e.deltaX, panY - e.deltaY);
      }
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spaceHeld.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        isPanning.current = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isHandTool && e.button !== 1) return;
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isHandTool]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan(panX + dx, panY + dy);
    },
    [panX, panY, setPan]
  );

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`studio-viewport ${className ?? ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        cursor: isHandTool ? "grab" : "default",
        background: "#1a1a1a",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Grid background */}
      <GridBackground zoom={zoom} panX={panX} panY={panY} />

      {/* Transform container */}
      <div
        className="studio-canvas-transform"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          willChange: "transform",
        }}
      >
        {children}
      </div>

      {/* Zoom indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          background: "rgba(0,0,0,0.7)",
          color: "#999",
          fontSize: 11,
          fontFamily: "monospace",
          padding: "4px 8px",
          borderRadius: 4,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

function GridBackground({
  zoom,
  panX,
  panY,
}: {
  zoom: number;
  panX: number;
  panY: number;
}) {
  const showGrid = useStudio((s) => s.showGrid);
  if (!showGrid) return null;

  const gridSize = 20;
  const scaledGrid = gridSize * zoom;
  const opacity = Math.min(0.3, zoom * 0.15);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,${opacity}) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,${opacity}) 1px, transparent 1px)
        `,
        backgroundSize: `${scaledGrid}px ${scaledGrid}px`,
        backgroundPosition: `${panX % scaledGrid}px ${panY % scaledGrid}px`,
        pointerEvents: "none",
      }}
    />
  );
}
