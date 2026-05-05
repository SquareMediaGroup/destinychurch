"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BuilderElement, BuilderPage, ElementType } from "@/lib/builder/types";
import { newId } from "@/lib/builder/types";
import { createElement } from "@/lib/builder/defaults";
import Canvas from "./Canvas";
import CanvasToolbar from "./CanvasToolbar";
import PropertiesPanel from "./PropertiesPanel";
import ElementTree from "./ElementTree";

type Props = {
  initialPage: BuilderPage;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function BuilderEditor({ initialPage }: Props) {
  const [page, setPage] = useState<BuilderPage>(initialPage);
  const [layout, setLayout] = useState<BuilderElement[]>(initialPage.layout_json || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showLayers, setShowLayers] = useState(false);

  const selectedElement = useMemo<BuilderElement | null>(() => {
    if (!selectedId) return null;
    return findElement(layout, selectedId);
  }, [layout, selectedId]);

  const handleAdd = useCallback((type: ElementType) => {
    const el = createElement(type);
    setLayout((prev) => [...prev, el]);
    setSelectedId(el.id);
  }, []);

  const handleUpdate = useCallback((id: string, patch: Partial<BuilderElement>) => {
    setLayout((prev) => updateElement(prev, id, patch));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setLayout((prev) => removeElement(prev, id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const handleDuplicate = useCallback((id: string) => {
    setLayout((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const copy = cloneWithNewIds(prev[idx]);
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }, []);

  const handleMoveUp = useCallback((id: string) => {
    setLayout((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((id: string) => {
    setLayout((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  // Auto-save: debounce 1.5s after layout/title changes
  useEffect(() => {
    if (!page.id) return;
    setSaveState("idle");
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/admin/builder/pages/${page.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: page.title,
            slug: page.slug,
            layout_json: layout,
          }),
        });
        setSaveState(res.ok ? "saved" : "error");
        if (res.ok) {
          setTimeout(() => setSaveState("idle"), 2000);
        }
      } catch {
        setSaveState("error");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [layout, page.title, page.slug, page.id]);

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-[#f5f7fa]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-black/8 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/builder"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/60 hover:bg-[#f5f7fa]"
            title="Back to pages"
          >
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </Link>
          <div>
            <input
              type="text"
              value={page.title}
              onChange={(e) => setPage((p) => ({ ...p, title: e.target.value }))}
              className="rounded-md border-transparent bg-transparent px-1 text-sm font-bold text-destiny-grey hover:bg-[#f5f7fa] focus:bg-white focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
            <div className="flex items-center gap-2 px-1 text-[11px] text-destiny-grey/50">
              <span>/{page.slug}</span>
              <span>·</span>
              <SaveIndicator state={saveState} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLayers((s) => !s)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              showLayers
                ? "bg-destiny-grey/10 text-destiny-grey"
                : "text-destiny-grey/60 hover:bg-[#f5f7fa]"
            }`}
          >
            <span className="material-symbols-rounded text-base">layers</span>
            Layers
          </button>
          <span className="rounded-md bg-destiny-grey/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destiny-grey/60">
            {page.status}
          </span>
        </div>
      </header>

      {/* Main 3-column workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: components palette */}
        <aside className="w-64 shrink-0 border-r border-black/8">
          <CanvasToolbar onAddElement={handleAdd} />
        </aside>

        {/* Optional layers panel */}
        {showLayers && (
          <aside className="w-56 shrink-0 border-r border-black/8">
            <ElementTree
              layout={layout}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          </aside>
        )}

        {/* Center: canvas */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto my-6 max-w-5xl rounded-2xl border border-black/8 bg-white shadow-sm">
            <Canvas
              layout={layout}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDropElement={handleAdd}
            />
          </div>
        </main>

        {/* Right: properties */}
        <aside className="w-72 shrink-0 border-l border-black/8">
          <PropertiesPanel
            element={selectedElement}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </aside>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="text-destiny-grey/50">Saving…</span>;
  if (state === "saved") return <span className="text-green-600">Saved</span>;
  if (state === "error") return <span className="text-red-600">Error saving</span>;
  return <span className="text-destiny-grey/30">Auto-save on</span>;
}

// Helpers — recursive tree operations
function findElement(layout: BuilderElement[], id: string): BuilderElement | null {
  for (const el of layout) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElement(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

function updateElement(
  layout: BuilderElement[],
  id: string,
  patch: Partial<BuilderElement>,
): BuilderElement[] {
  return layout.map((el) => {
    if (el.id === id) {
      return { ...el, ...patch };
    }
    if (el.children) {
      return { ...el, children: updateElement(el.children, id, patch) };
    }
    return el;
  });
}

function removeElement(layout: BuilderElement[], id: string): BuilderElement[] {
  return layout
    .filter((el) => el.id !== id)
    .map((el) =>
      el.children ? { ...el, children: removeElement(el.children, id) } : el,
    );
}

function cloneWithNewIds(el: BuilderElement): BuilderElement {
  return {
    ...el,
    id: newId(),
    children: el.children?.map(cloneWithNewIds),
  };
}
