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
import AIAssistant from "./AIAssistant";
import BreakpointToolbar, { BREAKPOINT_WIDTHS, type Breakpoint } from "./BreakpointToolbar";

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
  const [showAssistant, setShowAssistant] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");

  const selectedElement = useMemo<BuilderElement | null>(() => {
    if (!selectedId) return null;
    return findElement(layout, selectedId);
  }, [layout, selectedId]);

  const handleAdd = useCallback((type: ElementType) => {
    const el = createElement(type);
    setLayout((prev) => [...prev, el]);
    setSelectedId(el.id);
  }, []);

  const handleDropInto = useCallback((parentId: string, type: ElementType) => {
    const el = createElement(type);
    setLayout((prev) => insertChild(prev, parentId, el));
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
    setLayout((prev) => duplicateElement(prev, id));
  }, []);

  const handleMove = useCallback((id: string, direction: -1 | 1) => {
    setLayout((prev) => moveSibling(prev, id, direction));
  }, []);

  const handleReorder = useCallback((draggedId: string, targetId: string, position: "before" | "after") => {
    setLayout((prev) => reorderElement(prev, draggedId, targetId, position));
  }, []);

  const handleInsertFromAI = useCallback((element: BuilderElement, position: "after" | "end") => {
    if (position === "end") {
      setLayout((prev) => [...prev, element]);
    } else if (selectedId) {
      setLayout((prev) => insertAfterElement(prev, selectedId, element));
    } else {
      setLayout((prev) => [...prev, element]);
    }
    setSelectedId(element.id);
  }, [selectedId]);

  const handleStatusChange = useCallback(
    async (status: "draft" | "published" | "archived") => {
      if (!page.id) return;
      const res = await fetch(`/api/admin/builder/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setPage((p) => ({ ...p, status: data.page.status, published_at: data.page.published_at }));
      }
    },
    [page.id],
  );

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

  const canvasMaxWidth = BREAKPOINT_WIDTHS[breakpoint];

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-zinc-900 px-3 py-2 text-zinc-100">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/builder"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 hover:bg-white/5 hover:text-white"
            title="Back to pages"
          >
            <span className="material-symbols-rounded text-[18px]">arrow_back</span>
          </Link>
          <div>
            <input
              type="text"
              value={page.title}
              onChange={(e) => setPage((p) => ({ ...p, title: e.target.value }))}
              className="rounded border-transparent bg-transparent px-1 text-xs font-semibold text-white hover:bg-white/5 focus:bg-white/10 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 px-1 text-[10px] text-white/40">
              <span>/{page.slug}</span>
              <span>·</span>
              <SaveIndicator state={saveState} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BreakpointToolbar value={breakpoint} onChange={setBreakpoint} />
          <button
            type="button"
            onClick={() => setShowLayers((s) => !s)}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              showLayers
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="material-symbols-rounded text-[15px]">layers</span>
            Layers
          </button>
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              page.status === "published"
                ? "bg-emerald-500/15 text-emerald-400"
                : page.status === "draft"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-white/5 text-white/40"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${
              page.status === "published" ? "bg-emerald-400" : page.status === "draft" ? "bg-amber-400" : "bg-white/40"
            }`} />
            {page.status}
          </span>
          <Link
            href={`/admin/builder/${page.id}/preview`}
            target="_blank"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
          >
            <span className="material-symbols-rounded text-[15px]">visibility</span>
            Preview
          </Link>
          {page.status === "published" ? (
            <>
              <a
                href={`/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
              >
                <span className="material-symbols-rounded text-[15px]">open_in_new</span>
                Live
              </a>
              <button
                type="button"
                onClick={() => handleStatusChange("draft")}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
              >
                Unpublish
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleStatusChange("published")}
              className="flex items-center gap-1 rounded-md bg-destiny-orange px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-destiny-orange/30 hover:brightness-110"
            >
              <span className="material-symbols-rounded text-[15px]">rocket_launch</span>
              Publish
            </button>
          )}
        </div>
      </header>

      {/* Main 3-column workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: components palette */}
        <aside className="w-56 shrink-0 border-r border-white/5">
          <CanvasToolbar onAddElement={handleAdd} />
        </aside>

        {/* Optional layers panel */}
        {showLayers && (
          <aside className="w-52 shrink-0 border-r border-white/5">
            <ElementTree
              layout={layout}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveUp={(id) => handleMove(id, -1)}
              onMoveDown={(id) => handleMove(id, 1)}
              onReorder={handleReorder}
            />
          </aside>
        )}

        {/* Center: canvas */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-8">
          <div
            className="mx-auto overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/40 transition-[max-width] duration-300 ring-1 ring-white/5"
            style={{ maxWidth: `${canvasMaxWidth}px` }}
          >
            <Canvas
              layout={layout}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDropElement={handleAdd}
              onDropInto={handleDropInto}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          </div>
        </main>

        {/* Right: properties or AI assistant */}
        <aside className="w-80 shrink-0 border-l border-white/5 flex flex-col">
          {showAssistant ? (
            <AIAssistant
              pageId={page.id || ""}
              pageType={page.title?.split(" ")[0]?.toLowerCase() || "page"}
              currentElements={layout}
              onInsertElement={handleInsertFromAI}
            />
          ) : (
            <PropertiesPanel
              element={selectedElement}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}
          <div className="border-t border-white/5 p-2 flex gap-1">
            <button
              onClick={() => setShowAssistant(false)}
              className={`flex-1 px-2 py-1 text-xs rounded ${
                !showAssistant
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Properties
            </button>
            <button
              onClick={() => setShowAssistant(true)}
              className={`flex-1 px-2 py-1 text-xs rounded ${
                showAssistant
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              ✨ AI
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="text-white/50">Saving…</span>;
  if (state === "saved") return <span className="text-emerald-400">Saved</span>;
  if (state === "error") return <span className="text-red-400">Error</span>;
  return <span className="text-white/30">Auto-save</span>;
}

// ── Recursive tree operations ──────────────────────────────────────────

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
    if (el.id === id) return { ...el, ...patch };
    if (el.children) return { ...el, children: updateElement(el.children, id, patch) };
    return el;
  });
}

function removeElement(layout: BuilderElement[], id: string): BuilderElement[] {
  return layout
    .filter((el) => el.id !== id)
    .map((el) => (el.children ? { ...el, children: removeElement(el.children, id) } : el));
}

function insertChild(
  layout: BuilderElement[],
  parentId: string,
  child: BuilderElement,
): BuilderElement[] {
  return layout.map((el) => {
    if (el.id === parentId) {
      return { ...el, children: [...(el.children || []), child] };
    }
    if (el.children) {
      return { ...el, children: insertChild(el.children, parentId, child) };
    }
    return el;
  });
}

function duplicateElement(layout: BuilderElement[], id: string): BuilderElement[] {
  const out: BuilderElement[] = [];
  for (const el of layout) {
    out.push(el.children ? { ...el, children: duplicateElement(el.children, id) } : el);
    if (el.id === id) out.push(cloneWithNewIds(el));
  }
  return out;
}

function moveSibling(
  layout: BuilderElement[],
  id: string,
  direction: -1 | 1,
): BuilderElement[] {
  const idx = layout.findIndex((e) => e.id === id);
  if (idx !== -1) {
    const target = idx + direction;
    if (target < 0 || target >= layout.length) return layout;
    const next = [...layout];
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  }
  return layout.map((el) =>
    el.children ? { ...el, children: moveSibling(el.children, id, direction) } : el,
  );
}

function reorderElement(
  layout: BuilderElement[],
  draggedId: string,
  targetId: string,
  position: "before" | "after",
): BuilderElement[] {
  if (draggedId === targetId) return layout;
  const dragged = findElement(layout, draggedId);
  if (!dragged) return layout;
  // Don't allow dragging into own descendant
  if (containsId(dragged, targetId)) return layout;
  const removed = removeElement(layout, draggedId);
  return insertNear(removed, targetId, dragged, position);
}

function containsId(el: BuilderElement, id: string): boolean {
  if (el.id === id) return true;
  return (el.children || []).some((c) => containsId(c, id));
}

function insertNear(
  layout: BuilderElement[],
  targetId: string,
  newEl: BuilderElement,
  position: "before" | "after",
): BuilderElement[] {
  const idx = layout.findIndex((e) => e.id === targetId);
  if (idx !== -1) {
    const insertAt = position === "before" ? idx : idx + 1;
    return [...layout.slice(0, insertAt), newEl, ...layout.slice(insertAt)];
  }
  return layout.map((el) =>
    el.children ? { ...el, children: insertNear(el.children, targetId, newEl, position) } : el,
  );
}

function cloneWithNewIds(el: BuilderElement): BuilderElement {
  return {
    ...el,
    id: newId(),
    children: el.children?.map(cloneWithNewIds),
  };
}

function insertAfterElement(
  layout: BuilderElement[],
  targetId: string,
  newEl: BuilderElement,
): BuilderElement[] {
  return insertNear(layout, targetId, newEl, "after");
}
