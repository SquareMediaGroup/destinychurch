"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudio } from "@/packages/studio-engine/src/store";
import { useKeymap } from "@/packages/studio-engine/src/keymap";
import { Viewport } from "@/packages/studio-canvas/src/Viewport";
import { CanvasNodeRenderer } from "@/packages/studio-canvas/src/NodeRenderer";
import { SelectionOverlay } from "@/packages/studio-canvas/src/Overlay";
import { InteractionLayer } from "@/packages/studio-canvas/src/InteractionLayer";
import { Toolbar } from "@/packages/studio-ui/src/Toolbar";
import { LayersPanel } from "@/packages/studio-ui/src/panels/LayersPanel";
import { InsertPanel } from "@/packages/studio-ui/src/panels/InsertPanel";
import { PropertiesPanel } from "@/packages/studio-ui/src/PropertiesPanel";
import { ContextMenuProvider, useCanvasContextMenu } from "@/packages/studio-ui/src/ContextMenu";
import { TokenStyle } from "@/packages/studio-tokens/src/css-vars";
import { DEFAULT_TOKENS } from "@/packages/studio-tokens/src/defaults";
import type { StudioDocument } from "@/packages/studio-schema/src/types";
import { createDocument } from "@/packages/studio-schema/src/types";

type LeftPanel = "layers" | "insert" | null;

export default function StudioEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("layers");
  const [pageTitle, setPageTitle] = useState("Untitled");
  const [saving, setSaving] = useState(false);

  const loadDocument = useStudio((s) => s.loadDocument);
  const document = useStudio((s) => s.document);
  const dirty = useStudio((s) => s.dirty);
  const clearSelection = useStudio((s) => s.clearSelection);
  const saveTimerRef = useRef<NodeJS.Timeout>(undefined);
  const handleContextMenu = useCanvasContextMenu();

  useKeymap();

  // Load page
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/studio/pages/${pageId}`);
        if (!res.ok) {
          if (res.status === 404) {
            // New page — init empty document
            const doc = createDocument(pageId);
            doc.tokens = DEFAULT_TOKENS;
            loadDocument(doc);
            setLoading(false);
            return;
          }
          throw new Error("Failed to load page");
        }
        const data = await res.json();
        setPageTitle(data.title ?? "Untitled");
        if (data.document) {
          loadDocument(data.document as StudioDocument);
        } else {
          const doc = createDocument(pageId);
          doc.tokens = DEFAULT_TOKENS;
          loadDocument(doc);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pageId, loadDocument]);

  // Auto-save
  useEffect(() => {
    if (!dirty || loading) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      save();
    }, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [dirty, document, loading]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/studio/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pageTitle,
          document: useStudio.getState().document,
        }),
      });
      useStudio.getState().markSaved();
    } catch {
      console.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [pageId, pageTitle]);

  // Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  if (loading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111",
          color: "#888",
          fontSize: 14,
        }}
      >
        Loading editor...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111",
          color: "#ef4444",
          fontSize: 14,
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p>{error}</p>
        <button
          onClick={() => router.push("/admin/studio")}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #333",
            background: "#222",
            color: "#ccc",
            cursor: "pointer",
          }}
        >
          Back to pages
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#111",
        overflow: "hidden",
      }}
    >
      <TokenStyle tokens={document.tokens} />
      <ContextMenuProvider />

      {/* Top toolbar */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <Toolbar />
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 10,
          }}
        >
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ccc",
              fontSize: 13,
              fontWeight: 500,
              textAlign: "center",
              outline: "none",
              width: 200,
            }}
          />
          {saving && (
            <span style={{ fontSize: 10, color: "#666" }}>Saving...</span>
          )}
          {!saving && dirty && (
            <span style={{ fontSize: 10, color: "#f59e0b" }}>Unsaved</span>
          )}
          {!saving && !dirty && (
            <span style={{ fontSize: 10, color: "#22c55e" }}>Saved</span>
          )}
        </div>
      </div>

      {/* Main editor area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left sidebar toggle + panel */}
        <div style={{ display: "flex", height: "100%" }}>
          {/* Panel toggle bar */}
          <div
            style={{
              width: 40,
              background: "#151515",
              borderRight: "1px solid #2a2a2a",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 8,
              gap: 2,
            }}
          >
            <PanelToggle
              icon="layers"
              active={leftPanel === "layers"}
              onClick={() =>
                setLeftPanel(leftPanel === "layers" ? null : "layers")
              }
              tooltip="Layers"
            />
            <PanelToggle
              icon="add_box"
              active={leftPanel === "insert"}
              onClick={() =>
                setLeftPanel(leftPanel === "insert" ? null : "insert")
              }
              tooltip="Insert"
            />
          </div>

          {/* Panel content */}
          {leftPanel === "layers" && <LayersPanel />}
          {leftPanel === "insert" && <InsertPanel />}
        </div>

        {/* Canvas */}
        <div
          style={{ flex: 1, position: "relative" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
          onContextMenu={handleContextMenu}
        >
          <Viewport>
            {/* Page frame centered at origin */}
            <div
              style={{
                width: 1440,
                minHeight: 900,
                background: "#ffffff",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.3)",
                position: "relative",
              }}
            >
              <CanvasNodeRenderer
                nodeId={document.root}
                editable
              />
            </div>
          </Viewport>
          <SelectionOverlay />
          <InteractionLayer />
        </div>

        {/* Right sidebar */}
        <PropertiesPanel />
      </div>
    </div>
  );
}

function PanelToggle({
  icon,
  active,
  onClick,
  tooltip,
}: {
  icon: string;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        border: "none",
        background: active ? "#333" : "transparent",
        color: active ? "#fff" : "#666",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
        {icon}
      </span>
    </button>
  );
}
