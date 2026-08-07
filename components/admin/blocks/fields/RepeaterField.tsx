"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import type { RepeaterFieldSchema, RepeaterItem } from "@/components/blocks/types";
import { useListReorder } from "../useListReorder";
import { FieldRenderer } from "./FieldRenderer";

export function RepeaterField({
  field,
  value,
  onChange,
}: {
  field: RepeaterFieldSchema;
  value: RepeaterItem[];
  onChange: (next: RepeaterItem[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const { rowProps, move } = useListReorder(items, onChange);

  const atMax = field.max !== undefined && items.length >= field.max;
  const atMin = field.min !== undefined && items.length <= field.min;

  function update(index: number, patch: Record<string, unknown>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function add() {
    // nanoid gives stable React keys and stable drag identity across reorders —
    // array indices would make both wrong the moment a row moves.
    const item: RepeaterItem = { id: nanoid(8), ...field.itemDefaults };
    onChange([...items, item]);
    setOpenId(item.id);
  }

  function duplicate(index: number) {
    const copy: RepeaterItem = { ...items[index], id: nanoid(8) };
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setOpenId(copy.id);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-destiny-grey/45">
          {field.label}
        </span>
        <span className="text-[11px] font-medium text-destiny-grey/35">
          {items.length}
        </span>
      </div>
      {field.help && (
        <p className="mb-2 text-xs leading-relaxed text-destiny-grey/45">{field.help}</p>
      )}

      <div className="flex flex-col gap-1.5">
        {items.map((item, index) => {
          const open = openId === item.id;
          return (
            <div
              key={item.id}
              {...rowProps(index)}
              className="overflow-hidden rounded-xl border border-black/10 bg-white"
            >
              <div className="flex items-center gap-1 px-1.5 py-1.5">
                <span
                  draggable
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                  className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-destiny-grey/30 hover:bg-black/5 active:cursor-grabbing"
                >
                  <span className="material-symbols-rounded text-[17px]">
                    drag_indicator
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-destiny-grey">
                    {field.itemLabel(item, index)}
                  </span>
                  <span
                    aria-hidden
                    className={`material-symbols-rounded shrink-0 text-[18px] text-destiny-grey/35 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {/* Up/down are the only reorder path on touch and by keyboard —
                    HTML5 drag supports neither. */}
                <RowButton
                  icon="keyboard_arrow_up"
                  label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
                <RowButton
                  icon="keyboard_arrow_down"
                  label="Move down"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                />
                <RowButton
                  icon="content_copy"
                  label="Duplicate"
                  disabled={atMax}
                  onClick={() => duplicate(index)}
                />
                <RowButton
                  icon="close"
                  label="Remove"
                  disabled={atMin}
                  onClick={() => remove(index)}
                />
              </div>

              {open && (
                <div className="flex flex-col gap-3 border-t border-black/5 bg-[#fbfcfd] px-3 py-3">
                  {field.itemFields.map((itemField) => (
                    <FieldRenderer
                      key={itemField.name}
                      field={itemField}
                      value={item[itemField.name]}
                      onChange={(next) => update(index, { [itemField.name]: next })}
                      depth={1}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={atMax}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/15 px-3 py-2 text-xs font-bold text-destiny-grey/55 transition hover:border-destiny-orange/40 hover:bg-destiny-orange/5 hover:text-destiny-grey disabled:opacity-40"
      >
        <span className="material-symbols-rounded text-[16px]">add</span>
        {field.addLabel}
      </button>
    </div>
  );
}

function RowButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-destiny-grey/35 transition hover:bg-black/5 hover:text-destiny-grey disabled:pointer-events-none disabled:opacity-25"
    >
      <span className="material-symbols-rounded text-[16px]">{icon}</span>
    </button>
  );
}
