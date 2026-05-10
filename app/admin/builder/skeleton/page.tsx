"use client";

import { useState } from "react";
import Link from "next/link";

type BlockKind =
  | "hero"
  | "heading"
  | "content"
  | "image"
  | "video"
  | "churchsuite-form"
  | "cta"
  | "gallery"
  | "testimonial"
  | "faq"
  | "team"
  | "spacer";

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

type CanvasBlock = BlockDef & { id: string };

const STARTER_BLOCKS: CanvasBlock[] = [
  { ...PALETTE[0], id: "starter-hero" },
  { ...PALETTE[2], id: "starter-content" },
  { ...PALETTE[4], id: "starter-video" },
];

let counter = 0;
function nextId(kind: BlockKind): string {
  counter += 1;
  return `${kind}-${Date.now()}-${counter}`;
}

export default function SkeletonBuilderPage() {
  const [blocks, setBlocks] = useState<CanvasBlock[]>(STARTER_BLOCKS);
  const [dragKind, setDragKind] = useState<BlockKind | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [paletteOver, setPaletteOver] = useState(false);

  function addBlockAt(kind: BlockKind, index: number) {
    const def = PALETTE.find((p) => p.kind === kind);
    if (!def) return;
    const block: CanvasBlock = { ...def, id: nextId(kind) };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, block);
      return next;
    });
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
  }

  function clearCanvas() {
    if (!confirm("Clear all blocks?")) return;
    setBlocks([]);
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
    <div className="min-h-screen bg-[#fafafa]">
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
          </div>
          <p className="mt-2 max-w-3xl text-sm text-destiny-grey/60">
            Drag blocks from the left onto the canvas to sketch a page layout.
            Reorder by dragging, delete by dragging back to the palette. The AI
            will eventually use this skeleton to know where each section belongs.
            <span className="ml-1 font-bold text-destiny-grey/80">
              No saving yet — this is a UI preview.
            </span>
          </p>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
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
                onDragStart={(e) => onPaletteDragStart(e, p.kind)}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#fafafa] p-3 text-[11px] leading-relaxed text-destiny-grey/60">
            <p className="mb-1 font-bold text-destiny-grey/70">How to use</p>
            <ul className="list-disc pl-4">
              <li>Drag a block into the canvas to add it</li>
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
              onDragOver={(e) => onSlotDragOver(e, 0)}
              onDragLeave={() => setDropIndex(null)}
              onDrop={(e) => onSlotDrop(e, 0)}
            />

            {blocks.map((b, i) => (
              <div key={b.id}>
                <CanvasItem
                  block={b}
                  isDragging={dragId === b.id}
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
                    <span className="text-xs text-destiny-grey/40">— {b.description}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PaletteCard({
  def,
  onDragStart,
  onDragEnd,
}: {
  def: BlockDef;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group flex cursor-grab items-start gap-3 rounded-xl border border-black/5 bg-white p-3 transition hover:-translate-y-0.5 hover:border-destiny-orange/30 hover:shadow-md active:cursor-grabbing"
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
        drag_indicator
      </span>
    </div>
  );
}

function DropSlot({
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
      className={`h-2 rounded-full transition-all ${
        active
          ? "my-2 h-12 bg-destiny-orange/15 ring-2 ring-destiny-orange/40"
          : "my-1"
      }`}
    >
      {active && (
        <div className="flex h-full items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-destiny-orange">
          <span className="material-symbols-rounded text-base">add</span>
          Drop here
        </div>
      )}
    </div>
  );
}

function CanvasItem({
  block,
  isDragging,
  onDragStart,
  onDragEnd,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: CanvasBlock;
  isDragging: boolean;
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

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative cursor-grab rounded-xl border border-black/5 bg-white shadow-sm transition active:cursor-grabbing ${
        isDragging ? "opacity-30" : "hover:shadow-md"
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
            onClick={() => onMoveUp?.()}
            label="Move up"
          />
          <IconButton
            icon="keyboard_arrow_down"
            disabled={!onMoveDown}
            onClick={() => onMoveDown?.()}
            label="Move down"
          />
          <IconButton
            icon="close"
            onClick={onRemove}
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
  onClick: () => void;
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
