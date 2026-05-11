"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type BlockKind,
  type BlockData,
  type Skeleton,
  SKELETON_SESSION_KEY,
  blockHasContent,
} from "@/lib/ai/skeleton-types";

type BlockDef = {
  kind: BlockKind;
  label: string;
  icon: string;
  description: string;
  // Visual size hint for the canvas placeholder
  height: "sm" | "md" | "lg" | "xl";
  accent: string; // tailwind bg class for the icon tile
};

const PALETTE: BlockDef[] = [
  {
    kind: "hero",
    label: "Hero",
    icon: "panorama",
    description: "Full-width banner with headline, subhead and CTA",
    height: "xl",
    accent: "bg-destiny-orange/10 text-destiny-orange",
  },
  {
    kind: "heading",
    label: "Heading",
    icon: "title",
    description: "Section title",
    height: "sm",
    accent: "bg-amber-100 text-amber-700",
  },
  {
    kind: "content",
    label: "Content",
    icon: "subject",
    description: "Rich text / paragraphs",
    height: "md",
    accent: "bg-sky-100 text-sky-700",
  },
  {
    kind: "image",
    label: "Image",
    icon: "image",
    description: "Single inline image",
    height: "md",
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    kind: "video",
    label: "Video",
    icon: "smart_display",
    description: "YouTube, Vimeo or uploaded video",
    height: "lg",
    accent: "bg-rose-100 text-rose-700",
  },
  {
    kind: "churchsuite-form",
    label: "ChurchSuite Form",
    icon: "assignment",
    description: "Embedded sign-up / connect form",
    height: "lg",
    accent: "bg-violet-100 text-violet-700",
  },
  {
    kind: "cta",
    label: "Call to action",
    icon: "ads_click",
    description: "Buttons or highlighted action row",
    height: "sm",
    accent: "bg-destiny-orange/10 text-destiny-orange",
  },
  {
    kind: "gallery",
    label: "Gallery",
    icon: "collections",
    description: "Photo grid",
    height: "lg",
    accent: "bg-pink-100 text-pink-700",
  },
  {
    kind: "testimonial",
    label: "Testimonial",
    icon: "format_quote",
    description: "Quote with attribution",
    height: "md",
    accent: "bg-indigo-100 text-indigo-700",
  },
  {
    kind: "faq",
    label: "FAQ",
    icon: "help",
    description: "Question / answer accordion",
    height: "lg",
    accent: "bg-teal-100 text-teal-700",
  },
  {
    kind: "team",
    label: "Team / Pastors",
    icon: "groups",
    description: "Headshots with names and roles",
    height: "lg",
    accent: "bg-blue-100 text-blue-700",
  },
  {
    kind: "spacer",
    label: "Spacer",
    icon: "space_bar",
    description: "Vertical breathing room",
    height: "sm",
    accent: "bg-destiny-grey/10 text-destiny-grey/60",
  },
];

type CanvasBlock = BlockDef & { id: string; data: BlockData };

const STARTER_BLOCKS: CanvasBlock[] = [
  { ...PALETTE[0], id: "starter-hero", data: {} },
  { ...PALETTE[2], id: "starter-content", data: {} },
  { ...PALETTE[4], id: "starter-video", data: {} },
];

let counter = 0;
function nextId(kind: BlockKind): string {
  counter += 1;
  return `${kind}-${Date.now()}-${counter}`;
}

export default function SkeletonBuilderPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<CanvasBlock[]>(STARTER_BLOCKS);
  const [dragKind, setDragKind] = useState<BlockKind | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [paletteOver, setPaletteOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const isDragging = dragKind !== null || dragId !== null;

  function updateBlockData(id: string, patch: Partial<BlockData>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...patch } } : b))
    );
  }

  function continueToAI() {
    if (blocks.length === 0) return;
    const skeleton: Skeleton = {
      blocks: blocks.map((b) => ({ kind: b.kind, data: b.data })),
    };
    try {
      sessionStorage.setItem(SKELETON_SESSION_KEY, JSON.stringify(skeleton));
    } catch {
      // sessionStorage may be unavailable (private mode, etc.) — fall back to URL-only
    }
    const layout = blocks.map((b) => b.kind).join(",");
    router.push(`/admin/builder/ai?layout=${encodeURIComponent(layout)}`);
  }

  function addBlockAt(kind: BlockKind, index: number) {
    const def = PALETTE.find((p) => p.kind === kind);
    if (!def) return;
    const block: CanvasBlock = { ...def, id: nextId(kind), data: {} };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, block);
      return next;
    });
    setSelectedId(block.id);
  }

  function moveBlock(fromId: string, toIndex: number) {
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((b) => b.id === fromId);
      if (fromIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      const adjusted = toIndex > fromIndex ? toIndex - 1 : toIndex;
      next.splice(adjusted, 0, moved);
      return next;
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function clearCanvas() {
    if (!confirm("Clear all blocks?")) return;
    setBlocks([]);
    setSelectedId(null);
  }

  function onPaletteDragStart(e: React.DragEvent, kind: BlockKind) {
    setDragKind(kind);
    setDragId(null);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", `palette:${kind}`);
  }

  function onCanvasItemDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    setDragKind(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `canvas:${id}`);
  }

  function onSlotDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragId ? "move" : "copy";
    setDropIndex(index);
  }

  function onSlotDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragId) {
      moveBlock(dragId, index);
    } else if (dragKind) {
      addBlockAt(dragKind, index);
    }
    setDragKind(null);
    setDragId(null);
    setDropIndex(null);
  }

  function onDragEnd() {
    setDragKind(null);
    setDragId(null);
    setDropIndex(null);
    setPaletteOver(false);
  }

  // Drag a canvas block onto the palette to delete it
  function onPaletteDragOver(e: React.DragEvent) {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setPaletteOver(true);
  }

  function onPaletteDrop(e: React.DragEvent) {
    if (!dragId) return;
    e.preventDefault();
    removeBlock(dragId);
    setDragId(null);
    setPaletteOver(false);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-28">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-black/5 bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(245,128,33,0.08), transparent 50%), radial-gradient(circle at 100% 100%, rgba(245,128,33,0.06), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10">
          <Link
            href="/admin/builder"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-destiny-grey/50 hover:text-destiny-orange transition"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            Back to pages
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-destiny-grey md:text-4xl">
              Skeleton sketcher
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-destiny-orange to-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Beta
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-destiny-grey/60">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-destiny-grey/60">
            Drag blocks from the left onto the canvas to sketch a page layout,
            then hit <strong>Use this layout</strong>. The AI will follow your
            section order exactly when it generates the page.
            <span className="ml-1 font-bold text-destiny-grey/80">
              You don&apos;t have to use this — you can skip and let AI decide
              the layout entirely from your description.
            </span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/builder/ai"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
            >
              <span className="material-symbols-rounded text-base">close</span>
              Skip — let AI decide everything
            </Link>
          </div>
        </div>
      </div>

      {/* Three-pane layout: palette / canvas / config */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[260px_1fr_320px]">
        {/* Palette */}
        <aside
          className={`h-fit rounded-2xl border bg-white p-4 shadow-sm transition lg:sticky lg:top-6 ${
            paletteOver
              ? "border-red-300 ring-4 ring-red-100"
              : "border-black/5"
          }`}
          onDragOver={onPaletteDragOver}
          onDragLeave={() => setPaletteOver(false)}
          onDrop={onPaletteDrop}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-destiny-grey/50">
              Blocks
            </h2>
            {paletteOver && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                <span className="material-symbols-rounded text-sm">delete</span>
                Drop to remove
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {PALETTE.map((p) => (
              <PaletteCard
                key={p.kind}
                def={p}
                onClick={() => addBlockAt(p.kind, blocks.length)}
                onDragStart={(e) => onPaletteDragStart(e, p.kind)}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#fafafa] p-3 text-[11px] leading-relaxed text-destiny-grey/60">
            <p className="mb-1 font-bold text-destiny-grey/70">How to use</p>
            <ul className="list-disc pl-4">
              <li>Click a block to add it to the bottom</li>
              <li>Or drag a block to drop it at a specific spot</li>
              <li>Drag a canvas block up or down to reorder</li>
              <li>Drag a canvas block back here to delete</li>
            </ul>
          </div>
        </aside>

        {/* Canvas */}
        <section className="min-h-[60vh] rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-destiny-grey">
                Page canvas
              </h2>
              <p className="text-xs text-destiny-grey/50">
                {blocks.length} block{blocks.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBlocks(STARTER_BLOCKS.map((b) => ({ ...b, id: nextId(b.kind) })))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11px] font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
              >
                <span className="material-symbols-rounded text-sm">refresh</span>
                Reset
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={blocks.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11px] font-bold text-destiny-grey/70 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-rounded text-sm">delete_sweep</span>
                Clear
              </button>
            </div>
          </div>

          <div
            className="rounded-xl bg-[#fafafa] p-4"
            onDragEnd={onDragEnd}
          >
            {/* Drop slot at top */}
            <DropSlot
              active={dropIndex === 0}
              dragging={isDragging}
              onDragOver={(e) => onSlotDragOver(e, 0)}
              onDragLeave={() => setDropIndex(null)}
              onDrop={(e) => onSlotDrop(e, 0)}
            />

            {blocks.map((b, i) => (
              <div key={b.id}>
                <CanvasItem
                  block={b}
                  isDragging={dragId === b.id}
                  isSelected={selectedId === b.id}
                  onSelect={() => setSelectedId(b.id)}
                  onDragStart={(e) => onCanvasItemDragStart(e, b.id)}
                  onDragEnd={onDragEnd}
                  onRemove={() => removeBlock(b.id)}
                  onMoveUp={
                    i > 0
                      ? () => moveBlock(b.id, i - 1)
                      : null
                  }
                  onMoveDown={
                    i < blocks.length - 1
                      ? () => moveBlock(b.id, i + 2)
                      : null
                  }
                />
                <DropSlot
                  active={dropIndex === i + 1}
                  dragging={isDragging}
                  onDragOver={(e) => onSlotDragOver(e, i + 1)}
                  onDragLeave={() => setDropIndex(null)}
                  onDrop={(e) => onSlotDrop(e, i + 1)}
                />
              </div>
            ))}

            {blocks.length === 0 && (
              <EmptyCanvas
                active={dropIndex === 0}
                onDragOver={(e) => onSlotDragOver(e, 0)}
                onDragLeave={() => setDropIndex(null)}
                onDrop={(e) => onSlotDrop(e, 0)}
              />
            )}
          </div>

          {/* Outline summary */}
          {blocks.length > 0 && (
            <div className="mt-5 rounded-xl border border-dashed border-black/10 p-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-destiny-grey/50">
                Layout outline
              </h3>
              <ol className="space-y-1 text-sm text-destiny-grey/80">
                {blocks.map((b, i) => (
                  <li key={b.id} className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-destiny-grey/10 font-mono text-[10px] font-bold text-destiny-grey/60">
                      {i + 1}
                    </span>
                    <span className="font-bold">{b.label}</span>
                    {blockHasContent(b.data) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                        configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destiny-grey/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destiny-grey/60">
                        AI writes
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {/* Config side panel */}
        <aside className="h-fit rounded-2xl border border-black/5 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          {selected ? (
            <ConfigPanel
              block={selected}
              onChange={(patch) => updateBlockData(selected.id, patch)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="text-center">
              <span className="material-symbols-rounded text-3xl text-destiny-grey/30">
                tune
              </span>
              <h2 className="mt-2 text-sm font-bold text-destiny-grey">
                Block settings
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-destiny-grey/60">
                Click any block on the canvas to add content, links, or notes
                for the AI. Anything you leave blank, the AI will write itself
                based on your description.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Sticky continue bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4">
          <div className="text-xs text-destiny-grey/70">
            {blocks.length === 0 ? (
              <span>Add at least one block to continue</span>
            ) : (
              <span className="font-bold text-destiny-grey">
                {blocks.length} block{blocks.length === 1 ? "" : "s"} —
                <span className="ml-2 font-mono text-destiny-grey/60">
                  {blocks.map((b) => b.label).join(" → ")}
                </span>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/builder"
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={continueToAI}
              disabled={blocks.length === 0}
              className="group inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-destiny-orange/40 disabled:cursor-not-allowed disabled:bg-destiny-grey/30 disabled:shadow-none disabled:hover:translate-y-0"
            >
              <span className="material-symbols-rounded text-base">auto_awesome</span>
              Use this layout
              <span className="material-symbols-rounded text-base transition group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaletteCard({
  def,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  def: BlockDef;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  // Track whether the user actually initiated a drag so the click handler
  // doesn't fire after a drop. Native HTML5 drag fires `click` on drop-cancel
  // in some browsers, which would double-add the block.
  const [didDrag, setDidDrag] = useState(false);

  return (
    <button
      type="button"
      draggable
      onClick={(e) => {
        if (didDrag) {
          setDidDrag(false);
          return;
        }
        e.preventDefault();
        onClick();
      }}
      onDragStart={(e) => {
        setDidDrag(true);
        onDragStart(e);
      }}
      onDragEnd={() => {
        onDragEnd();
        // Reset after the next tick so an immediately-following click is suppressed
        setTimeout(() => setDidDrag(false), 0);
      }}
      className="group flex w-full cursor-grab items-start gap-3 rounded-xl border border-black/5 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-destiny-orange/30 hover:shadow-md active:cursor-grabbing"
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${def.accent}`}
      >
        <span className="material-symbols-rounded text-lg">{def.icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-destiny-grey">{def.label}</div>
        <p className="line-clamp-1 text-[11px] text-destiny-grey/50">
          {def.description}
        </p>
      </div>
      <span className="material-symbols-rounded mt-1 text-base text-destiny-grey/30 opacity-0 transition group-hover:opacity-100">
        add
      </span>
    </button>
  );
}

function DropSlot({
  active,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  active: boolean;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  // When dragging, the slot is a large generous target so the drop almost
  // never misses. When idle, it's a thin spacer that fades into the layout.
  const sizeClass = active
    ? "my-2 h-14 bg-destiny-orange/15 ring-2 ring-destiny-orange/40"
    : dragging
      ? "my-1 h-10 bg-destiny-orange/[0.04] ring-1 ring-dashed ring-destiny-orange/20"
      : "my-1 h-2";

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-lg transition-all ${sizeClass}`}
    >
      {(active || dragging) && (
        <div
          className={`flex h-full items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${
            active ? "text-destiny-orange" : "text-destiny-orange/40"
          }`}
        >
          <span className="material-symbols-rounded text-base">add</span>
          {active ? "Drop here" : "Drop zone"}
        </div>
      )}
    </div>
  );
}

function CanvasItem({
  block,
  isDragging,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: CanvasBlock;
  isDragging: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
}) {
  const heightClass =
    block.height === "xl"
      ? "h-44"
      : block.height === "lg"
        ? "h-32"
        : block.height === "md"
          ? "h-24"
          : "h-16";

  const configured = blockHasContent(block.data);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group relative cursor-grab rounded-xl border bg-white shadow-sm transition active:cursor-grabbing ${
        isDragging ? "opacity-30" : "hover:shadow-md"
      } ${
        isSelected
          ? "border-destiny-orange ring-2 ring-destiny-orange/30"
          : "border-black/5"
      }`}
    >
      <div className={`flex ${heightClass} items-stretch overflow-hidden rounded-xl`}>
        {/* Left accent / icon */}
        <div className={`flex w-14 flex-shrink-0 items-center justify-center ${block.accent}`}>
          <span className="material-symbols-rounded text-2xl">{block.icon}</span>
        </div>

        {/* Body */}
        <div className="relative flex flex-1 flex-col justify-center px-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-destiny-grey/40">
              {block.kind}
            </span>
            <span className="material-symbols-rounded text-sm text-destiny-grey/20">
              drag_indicator
            </span>
            {configured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                <span className="material-symbols-rounded text-[10px]">check</span>
                Configured
              </span>
            )}
          </div>
          <div className="mt-1 text-base font-bold text-destiny-grey">
            {block.label}
          </div>
          <p className="text-xs text-destiny-grey/50">{block.description}</p>

          <SkeletonPreview kind={block.kind} />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center gap-1 border-l border-black/5 px-2 opacity-0 transition group-hover:opacity-100">
          <IconButton
            icon="keyboard_arrow_up"
            disabled={!onMoveUp}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            label="Move up"
          />
          <IconButton
            icon="keyboard_arrow_down"
            disabled={!onMoveDown}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            label="Move down"
          />
          <IconButton
            icon="close"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            label="Remove"
            destructive
          />
        </div>
      </div>
    </div>
  );
}

function IconButton({
  icon,
  onClick,
  disabled,
  destructive,
  label,
}: {
  icon: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  destructive?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-destiny-grey/60 transition disabled:cursor-not-allowed disabled:opacity-30 ${
        destructive
          ? "hover:bg-red-50 hover:text-red-600"
          : "hover:bg-[#f5f7fa] hover:text-destiny-grey"
      }`}
    >
      <span className="material-symbols-rounded text-base">{icon}</span>
    </button>
  );
}

// Decorative skeleton preview rendered inside each canvas block
function SkeletonPreview({ kind }: { kind: BlockKind }) {
  if (kind === "hero") {
    return (
      <div className="absolute inset-x-5 bottom-3 flex items-center gap-2">
        <div className="h-2 w-24 rounded-full bg-destiny-grey/10" />
        <div className="h-2 w-16 rounded-full bg-destiny-grey/10" />
        <div className="ml-auto h-5 w-20 rounded-full bg-destiny-orange/40" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="absolute right-5 top-1/2 -translate-y-1/2">
        <div className="flex h-12 w-20 items-center justify-center rounded-md bg-destiny-grey/10">
          <span className="material-symbols-rounded text-2xl text-destiny-grey/40">
            play_circle
          </span>
        </div>
      </div>
    );
  }
  if (kind === "churchsuite-form") {
    return (
      <div className="absolute right-5 top-1/2 flex w-32 -translate-y-1/2 flex-col gap-1.5">
        <div className="h-2 w-full rounded-full bg-destiny-grey/10" />
        <div className="h-2 w-full rounded-full bg-destiny-grey/10" />
        <div className="h-4 w-16 rounded-md bg-destiny-orange/40" />
      </div>
    );
  }
  if (kind === "gallery") {
    return (
      <div className="absolute right-5 top-1/2 grid -translate-y-1/2 grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-8 rounded bg-destiny-grey/10" />
        ))}
      </div>
    );
  }
  if (kind === "team") {
    return (
      <div className="absolute right-5 top-1/2 flex -translate-y-1/2 -space-x-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-8 rounded-full border-2 border-white bg-destiny-grey/15"
          />
        ))}
      </div>
    );
  }
  if (kind === "cta") {
    return (
      <div className="absolute right-5 top-1/2 -translate-y-1/2">
        <div className="h-5 w-20 rounded-full bg-destiny-orange/40" />
      </div>
    );
  }
  if (kind === "faq") {
    return (
      <div className="absolute right-5 top-1/2 flex w-28 -translate-y-1/2 flex-col gap-1">
        <div className="h-2 w-full rounded-full bg-destiny-grey/15" />
        <div className="h-2 w-3/4 rounded-full bg-destiny-grey/10" />
        <div className="h-2 w-full rounded-full bg-destiny-grey/15" />
      </div>
    );
  }
  return null;
}

function EmptyCanvas({
  active,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  active: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition ${
        active
          ? "border-destiny-orange bg-destiny-orange/5"
          : "border-black/15 bg-white"
      }`}
    >
      <span className="material-symbols-rounded text-4xl text-destiny-grey/30">
        widgets
      </span>
      <p className="mt-2 text-sm font-bold text-destiny-grey/60">
        Drag a block from the left to start
      </p>
      <p className="mt-1 text-xs text-destiny-grey/40">
        Hero, Content, Video, ChurchSuite Form, and more
      </p>
    </div>
  );
}

/* ----- Per-block configuration side panel ------------------------------ */

function ConfigPanel({
  block,
  onChange,
  onClose,
}: {
  block: CanvasBlock;
  onChange: (patch: Partial<BlockData>) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${block.accent}`}
          >
            <span className="material-symbols-rounded text-lg">{block.icon}</span>
          </span>
          <div>
            <h2 className="text-sm font-bold text-destiny-grey">{block.label}</h2>
            <p className="text-[11px] text-destiny-grey/50">{block.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="-mr-1 -mt-1 rounded-md p-1 text-destiny-grey/40 hover:bg-[#f5f7fa] hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-base">close</span>
        </button>
      </div>

      <p className="mb-4 rounded-lg bg-destiny-orange/5 px-3 py-2 text-[11px] leading-relaxed text-destiny-orange">
        Fill in the fields you want exact. Anything left blank, the AI will write
        based on your overall page description.
      </p>

      <div className="space-y-4">
        <ConfigFields block={block} onChange={onChange} />

        <ConfigField label="Notes for the AI" hint="Tone, anything special to call out">
          <textarea
            value={block.data.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={3}
            placeholder="e.g. keep the tone warm and inviting, mention childcare is provided"
            className={textareaClass}
          />
        </ConfigField>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-destiny-grey transition focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/10";
const textareaClass = `${inputClass} resize-y`;
const monoInputClass = `${inputClass} font-mono text-xs`;

function ConfigField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-destiny-grey/60">
        {label}
        {required && (
          <span className="rounded-full bg-destiny-orange/15 px-1.5 py-0 text-[9px] font-black text-destiny-orange">
            REQUIRED
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[10px] text-destiny-grey/50">{hint}</p>
      )}
    </div>
  );
}

function ConfigFields({
  block,
  onChange,
}: {
  block: CanvasBlock;
  onChange: (patch: Partial<BlockData>) => void;
}) {
  const d = block.data;
  switch (block.kind) {
    case "hero":
      return (
        <>
          <ConfigField label="Headline">
            <input
              type="text"
              value={d.heroTitle ?? ""}
              onChange={(e) => onChange({ heroTitle: e.target.value })}
              placeholder="e.g. Alpha is for everyone"
              className={inputClass}
            />
          </ConfigField>
          <ConfigField label="Subtitle">
            <textarea
              value={d.heroSubtitle ?? ""}
              onChange={(e) => onChange({ heroSubtitle: e.target.value })}
              rows={2}
              placeholder="One line of supporting copy under the headline"
              className={textareaClass}
            />
          </ConfigField>
          <ConfigField label="CTA button label">
            <input
              type="text"
              value={d.heroCtaLabel ?? ""}
              onChange={(e) => onChange({ heroCtaLabel: e.target.value })}
              placeholder="e.g. Sign up now"
              className={inputClass}
            />
          </ConfigField>
          <ConfigField label="CTA link" hint="Where the button goes — relative or absolute URL">
            <input
              type="text"
              value={d.heroCtaHref ?? ""}
              onChange={(e) => onChange({ heroCtaHref: e.target.value })}
              placeholder="/alpha/signup"
              className={monoInputClass}
            />
          </ConfigField>
        </>
      );

    case "heading":
      return (
        <ConfigField label="Heading text">
          <input
            type="text"
            value={d.headingText ?? ""}
            onChange={(e) => onChange({ headingText: e.target.value })}
            placeholder="e.g. What is Alpha?"
            className={inputClass}
          />
        </ConfigField>
      );

    case "content":
      return (
        <ConfigField
          label="Copy or brief"
          hint="If you paste exact prose, AI uses it verbatim. If you write a brief, AI generates copy that matches."
        >
          <textarea
            value={d.contentBody ?? ""}
            onChange={(e) => onChange({ contentBody: e.target.value })}
            rows={6}
            placeholder={
              "Either paste the exact text you want the AI to use, e.g.\n\"Alpha is a relaxed series of conversations…\"\n\nOR describe what to write:\n\"Explain that Alpha is for anyone curious about life and faith, no pressure, free meal each week.\""
            }
            className={textareaClass}
          />
        </ConfigField>
      );

    case "image":
      return (
        <>
          <ConfigField label="Image URL" hint="Paste a URL or upload via the AI page after this">
            <input
              type="url"
              value={d.imageUrl ?? ""}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
              placeholder="https://…"
              className={monoInputClass}
            />
          </ConfigField>
          <ConfigField label="Alt text" hint="Describe the image for screen readers and SEO">
            <input
              type="text"
              value={d.imageAlt ?? ""}
              onChange={(e) => onChange({ imageAlt: e.target.value })}
              placeholder="e.g. Volunteers serving coffee on a Sunday morning"
              className={inputClass}
            />
          </ConfigField>
          <ConfigField label="Caption">
            <input
              type="text"
              value={d.imageCaption ?? ""}
              onChange={(e) => onChange({ imageCaption: e.target.value })}
              placeholder="Optional caption shown under the image"
              className={inputClass}
            />
          </ConfigField>
        </>
      );

    case "video":
      return (
        <>
          <ConfigField label="Video URL" hint="YouTube, Vimeo or direct .mp4">
            <input
              type="url"
              value={d.videoUrl ?? ""}
              onChange={(e) => onChange({ videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=…"
              className={monoInputClass}
            />
          </ConfigField>
          <ConfigField label="Caption">
            <input
              type="text"
              value={d.videoCaption ?? ""}
              onChange={(e) => onChange({ videoCaption: e.target.value })}
              placeholder="Optional caption shown under the video"
              className={inputClass}
            />
          </ConfigField>
        </>
      );

    case "churchsuite-form":
      return (
        <>
          <ConfigField
            label="ChurchSuite form URL"
            required
            hint="Get this from ChurchSuite → Forms → Embed. Usually starts with https://destinytees.churchsuite.com/embed/forms/"
          >
            <input
              type="url"
              value={d.formUrl ?? ""}
              onChange={(e) => onChange({ formUrl: e.target.value })}
              placeholder="https://destinytees.churchsuite.com/embed/forms/…"
              className={monoInputClass}
            />
          </ConfigField>
          <ConfigField label="Form title" hint="Shown above the embedded form">
            <input
              type="text"
              value={d.formTitle ?? ""}
              onChange={(e) => onChange({ formTitle: e.target.value })}
              placeholder="e.g. Register for Alpha"
              className={inputClass}
            />
          </ConfigField>
        </>
      );

    case "cta":
      return (
        <>
          <ConfigField label="Heading">
            <input
              type="text"
              value={d.ctaHeading ?? ""}
              onChange={(e) => onChange({ ctaHeading: e.target.value })}
              placeholder="e.g. Ready to give it a try?"
              className={inputClass}
            />
          </ConfigField>
          <ConfigField label="Supporting line">
            <textarea
              value={d.ctaBody ?? ""}
              onChange={(e) => onChange({ ctaBody: e.target.value })}
              rows={2}
              placeholder="One line of supporting copy under the heading"
              className={textareaClass}
            />
          </ConfigField>
          <ConfigField label="Primary button label">
            <input
              type="text"
              value={d.ctaButtonLabel ?? ""}
              onChange={(e) => onChange({ ctaButtonLabel: e.target.value })}
              placeholder="e.g. Register for Alpha"
              className={inputClass}
            />
          </ConfigField>
          <ConfigField label="Primary button link">
            <input
              type="text"
              value={d.ctaButtonHref ?? ""}
              onChange={(e) => onChange({ ctaButtonHref: e.target.value })}
              placeholder="/alpha/signup"
              className={monoInputClass}
            />
          </ConfigField>
          <ConfigField label="Secondary button (optional)" hint="Label and link for a second, lower-emphasis button">
            <input
              type="text"
              value={d.ctaSecondaryLabel ?? ""}
              onChange={(e) => onChange({ ctaSecondaryLabel: e.target.value })}
              placeholder="e.g. Watch the promo"
              className={inputClass}
            />
            <input
              type="text"
              value={d.ctaSecondaryHref ?? ""}
              onChange={(e) => onChange({ ctaSecondaryHref: e.target.value })}
              placeholder="/alpha#promo"
              className={`${monoInputClass} mt-2`}
            />
          </ConfigField>
        </>
      );

    case "gallery":
      return (
        <ConfigField
          label="Image URLs"
          hint="One URL per line — AI will render them as a grid"
        >
          <textarea
            value={d.galleryUrls ?? ""}
            onChange={(e) => onChange({ galleryUrls: e.target.value })}
            rows={5}
            placeholder={"https://…/photo1.jpg\nhttps://…/photo2.jpg\nhttps://…/photo3.jpg"}
            className={`${textareaClass} font-mono text-xs`}
          />
        </ConfigField>
      );

    case "testimonial":
      return (
        <>
          <ConfigField label="Quote">
            <textarea
              value={d.testimonialQuote ?? ""}
              onChange={(e) => onChange({ testimonialQuote: e.target.value })}
              rows={3}
              placeholder='"Alpha changed the way I think about faith…"'
              className={textareaClass}
            />
          </ConfigField>
          <ConfigField label="Person's name">
            <input
              type="text"
              value={d.testimonialName ?? ""}
              onChange={(e) => onChange({ testimonialName: e.target.value })}
              placeholder="e.g. Sarah Bennett"
              className={inputClass}
            />
          </ConfigField>
          <ConfigField label="Role / description">
            <input
              type="text"
              value={d.testimonialRole ?? ""}
              onChange={(e) => onChange({ testimonialRole: e.target.value })}
              placeholder="e.g. Alpha guest, autumn 2025"
              className={inputClass}
            />
          </ConfigField>
        </>
      );

    case "faq":
      return (
        <ConfigField
          label="Questions and answers"
          hint="One Q/A per pair, e.g. 'Q: Is it free? A: Yes — every session is free.'"
        >
          <textarea
            value={d.faqList ?? ""}
            onChange={(e) => onChange({ faqList: e.target.value })}
            rows={8}
            placeholder={
              "Q: How long is each session?\nA: About 90 minutes, including a meal and a talk.\n\nQ: Do I have to come every week?\nA: No — come when you can."
            }
            className={textareaClass}
          />
        </ConfigField>
      );

    case "team":
      return (
        <ConfigField
          label="Team members"
          hint="One person per line, e.g. 'Jonathan & Cath Harris — Lead Pastors'"
        >
          <textarea
            value={d.teamList ?? ""}
            onChange={(e) => onChange({ teamList: e.target.value })}
            rows={6}
            placeholder={
              "Jonathan & Cath Harris — Lead Pastors\nLisa Smith — Worship Pastor\nDavid Chen — Youth Pastor"
            }
            className={textareaClass}
          />
        </ConfigField>
      );

    case "spacer":
    default:
      return (
        <p className="rounded-lg bg-[#fafafa] px-3 py-2 text-xs text-destiny-grey/60">
          No content needed for this block — it just adds vertical space.
        </p>
      );
  }
}
