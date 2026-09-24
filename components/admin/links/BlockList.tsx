"use client";

// The block stack in the links page editor: drag to reorder, expand to edit,
// switch on and off, duplicate, delete, and add new ones.
//
// Reordering is @dnd-kit rather than the native-drag useListReorder hook the
// training pages use: HTML5 drag-and-drop doesn't fire on touch screens, and
// this editor is used from a phone in the foyer as often as from a desk. The
// keyboard sensor makes the handle work with Space + arrow keys too.

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Toggle } from "@/components/admin/AdminUI";
import { useDialog } from "@/components/DialogProvider";
import type { PickerEvent } from "@/components/admin/EventPicker";
import {
  BLOCK_META,
  LINK_BLOCK_TYPES,
  blockLabel,
  defaultBlockData,
  type LinkBlockType,
} from "@/lib/linkPages/types";
import BlockFields, { ScheduleFields } from "./BlockFields";
import { blockProblem, newBlockId, type EditorBlock } from "./editorTypes";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Status chips for the collapsed card: what would stop this showing, at a glance. */
function statusChips(block: EditorBlock, problem: string | null, now: number) {
  const chips: { label: string; tone: "red" | "amber" | "grey" | "blue"; title?: string }[] = [];
  if (problem) chips.push({ label: "Needs finishing", tone: "red", title: problem });
  if (!block.active) chips.push({ label: "Hidden", tone: "grey" });
  if (block.starts_at && Date.parse(block.starts_at) > now)
    chips.push({ label: `From ${shortDate(block.starts_at)}`, tone: "blue" });
  else if (block.ends_at && Date.parse(block.ends_at) <= now) chips.push({ label: "Schedule ended", tone: "amber" });
  else if (block.ends_at) chips.push({ label: `Until ${shortDate(block.ends_at)}`, tone: "blue" });
  return chips;
}

const CHIP_TONES = {
  red: "bg-danger/10 text-danger",
  amber: "bg-warning/15 text-warning",
  grey: "bg-black/5 text-destiny-grey/60 dark:bg-white/10 dark:text-white/60",
  blue: "bg-info/10 text-info",
};

/** The muted second line: what the block is and where it goes. */
function detailLine(block: EditorBlock, typeLabel: string): string {
  const d = block.data;
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  switch (block.type) {
    case "link":
      return s("url") || "No link yet";
    case "event":
      return d.mode === "single" ? "Pinned event" : `Next ${Number(d.count ?? 3)} events${s("category") ? ` · ${s("category")}` : ""}`;
    case "embed":
      return s("url") || "Nothing embedded yet";
    case "form":
      return `${Array.isArray(d.fields) ? d.fields.length : 0} fields${s("notifyEmail") ? ` · emails ${s("notifyEmail")}` : ""}`;
    default:
      return typeLabel;
  }
}

function SortableBlock({
  block,
  index,
  expanded,
  onToggleExpand,
  onChange,
  onDuplicate,
  onDelete,
  events,
  eventsLoading,
  now,
}: {
  block: EditorBlock;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<EditorBlock>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  events: PickerEvent[] | null;
  eventsLoading: boolean;
  now: number;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const [showSchedule, setShowSchedule] = useState(Boolean(block.starts_at || block.ends_at));
  const meta = BLOCK_META[block.type];
  const problem = blockProblem(block);
  const chips = statusChips(block, problem, now);
  const label = blockLabel(block);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-2xl border bg-white transition-shadow dark:bg-destiny-grey-800 ${
        isDragging ? "z-10 border-destiny-orange/50 shadow-xl" : "border-black/8 dark:border-white/8"
      } ${block.active ? "" : "opacity-70"}`}
    >
      <div className="flex items-center gap-1.5 p-2 pr-3">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${label}. Press space, then use the arrow keys.`}
          className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-destiny-grey/35 hover:bg-black/5 active:cursor-grabbing dark:text-white/35"
        >
          <span className="material-symbols-rounded text-xl" aria-hidden="true">drag_indicator</span>
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1.5 text-left"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10 text-destiny-orange"
            aria-hidden="true"
          >
            <span className="material-symbols-rounded text-lg">
              {block.type === "link" && typeof block.data.icon === "string" && block.data.icon ? block.data.icon : meta.icon}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-bold text-destiny-grey dark:text-white">{label}</span>
              <span className="hidden shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/50 @sm:inline dark:bg-white/10 dark:text-white/50">
                {meta.label}
              </span>
            </span>
            <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  title={chip.title}
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${CHIP_TONES[chip.tone]}`}
                >
                  {chip.label}
                </span>
              ))}
              <span className="min-w-0 truncate text-xs text-destiny-grey/45 dark:text-white/45">
                {detailLine(block, meta.label)}
              </span>
            </span>
          </span>
          <span
            className={`material-symbols-rounded text-xl text-destiny-grey/35 transition-transform dark:text-white/35 ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            expand_more
          </span>
        </button>

        <div className="hidden items-center @md:flex">
          <IconAction icon="content_copy" label={`Duplicate ${label}`} onClick={onDuplicate} />
          <IconAction icon="delete" label={`Delete ${label}`} onClick={onDelete} danger />
        </div>
        <Toggle
          checked={block.active}
          onChange={(active) => onChange({ active })}
          label={block.active ? `Hide block ${index + 1}` : `Show block ${index + 1}`}
        />
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-black/5 px-4 pb-4 pt-4 dark:border-white/8">
          <BlockFields
            block={block}
            onData={(patch) => onChange({ data: { ...block.data, ...patch } })}
            events={events}
            eventsLoading={eventsLoading}
          />

          {showSchedule ? (
            <ScheduleFields block={block} onChange={onChange} />
          ) : (
            <button
              type="button"
              onClick={() => setShowSchedule(true)}
              className="inline-flex items-center gap-1 text-sm font-bold text-destiny-grey/55 hover:text-destiny-orange dark:text-white/55"
            >
              <span className="material-symbols-rounded text-lg" aria-hidden="true">schedule</span>
              Schedule when this shows
            </button>
          )}

          {/* Narrow panels have no room for the header's icon buttons. */}
          <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3 @md:hidden dark:border-white/8">
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-destiny-grey/60 hover:bg-black/5 dark:text-white/60"
            >
              <span className="material-symbols-rounded text-base" aria-hidden="true">content_copy</span>
              Duplicate
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-destiny-red/80 hover:bg-destiny-red/5"
            >
              <span className="material-symbols-rounded text-base" aria-hidden="true">delete</span>
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function IconAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
        danger
          ? "text-destiny-grey/35 hover:bg-destiny-red/5 hover:text-destiny-red dark:text-white/35"
          : "text-destiny-grey/35 hover:bg-black/5 hover:text-destiny-grey dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white"
      }`}
    >
      <span className="material-symbols-rounded text-lg" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

export default function BlockList({
  blocks,
  setBlocks,
  events,
  eventsLoading,
  now,
}: {
  blocks: EditorBlock[];
  setBlocks: (updater: (prev: EditorBlock[]) => EditorBlock[]) => void;
  events: PickerEvent[] | null;
  eventsLoading: boolean;
  now: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { confirm } = useDialog();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // A short press-and-hold on touch, so a scroll that starts on a handle
    // still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === active.id);
      const to = prev.findIndex((b) => b.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const update = (id: string, patch: Partial<EditorBlock>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const add = (type: LinkBlockType) => {
    const block: EditorBlock = {
      id: newBlockId(),
      type,
      active: true,
      starts_at: null,
      ends_at: null,
      data: defaultBlockData(type),
    };
    setBlocks((prev) => [...prev, block]);
    setExpanded(block.id);
    setAdding(false);
  };

  return (
    <div>
      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-6 py-10 text-center dark:border-white/15">
          <p className="text-sm font-bold text-destiny-grey dark:text-white">Nothing on this page yet</p>
          <p className="mt-1 text-sm text-destiny-grey/50 dark:text-white/50">Add a link, an event or a form to get started.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {blocks.map((block, index) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  index={index}
                  expanded={expanded === block.id}
                  onToggleExpand={() => setExpanded((e) => (e === block.id ? null : block.id))}
                  onChange={(patch) => update(block.id, patch)}
                  onDuplicate={() => {
                    const copy: EditorBlock = {
                      ...block,
                      id: newBlockId(),
                      data: JSON.parse(JSON.stringify(block.data)),
                    };
                    setBlocks((prev) => {
                      const i = prev.findIndex((b) => b.id === block.id);
                      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
                    });
                    setExpanded(copy.id);
                  }}
                  onDelete={async () => {
                    const ok = await confirm({
                      title: "Delete this block?",
                      message: `“${blockLabel(block)}” will be removed from the page when you save.${
                        block.type === "form" ? " Responses already sent through it are kept." : ""
                      }`,
                      confirmLabel: "Delete",
                      tone: "danger",
                    });
                    if (ok) setBlocks((prev) => prev.filter((b) => b.id !== block.id));
                  }}
                  events={events}
                  eventsLoading={eventsLoading}
                  now={now}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-4">
        {adding ? (
          <div className="rounded-2xl border border-black/8 bg-white p-3 dark:border-white/8 dark:bg-destiny-grey-800">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">Add a block</p>
              <button
                type="button"
                onClick={() => setAdding(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/45 hover:bg-black/5"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
              {LINK_BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => add(type)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-black/8 p-3 text-left transition hover:border-destiny-orange/50 hover:bg-destiny-orange/5 dark:border-white/8"
                >
                  <span className="material-symbols-rounded text-xl text-destiny-orange" aria-hidden="true">
                    {BLOCK_META[type].icon}
                  </span>
                  <span className="text-sm font-bold text-destiny-grey dark:text-white">{BLOCK_META[type].label}</span>
                  <span className="text-xs leading-snug text-destiny-grey/50 dark:text-white/50">
                    {BLOCK_META[type].description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-destiny-orange/40 py-3.5 text-sm font-bold text-destiny-orange transition hover:bg-destiny-orange/5"
          >
            <span className="material-symbols-rounded text-xl" aria-hidden="true">add</span>
            Add a block
          </button>
        )}
      </div>
    </div>
  );
}
