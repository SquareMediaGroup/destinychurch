"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BLOCKS } from "@/components/blocks/registry";
import { FieldRenderer } from "./fields/FieldRenderer";
import { useSelectedBlock } from "./useSelectedBlock";

const FLUSH_DELAY_MS = 200;

/** An unflushed edit, tagged with the block it belongs to. */
interface Draft {
  key: string;
  values: Record<string, unknown>;
}

/**
 * Settings panel for the selected block.
 *
 * Renders whatever `def.fields` declares, so no block ships its own form.
 */
export function BlockInspector({
  editor,
  onClose,
}: {
  editor: Editor | null;
  /** Mobile only — the desktop panel is always present. */
  onClose?: () => void;
}) {
  const selected = useSelectedBlock(editor);
  const def = selected ? BLOCKS[selected.blockName] : undefined;

  const [draft, setDraft] = useState<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = selected ? `${selected.pos}|${selected.blockName}` : "";

  const docValues = useMemo<Record<string, unknown>>(() => {
    if (!selected) return {};
    try {
      return JSON.parse(selected.propsJson);
    } catch {
      return {};
    }
  }, [selected]);

  /*
   * Values are DERIVED, not synced by an effect.
   *
   * `draft` is null whenever there's nothing pending, in which case the panel
   * simply follows the document. That falls out nicely:
   *
   *   - selecting another block invalidates the key, so the panel shows the new
   *     block's real props with no reset logic;
   *   - after a flush we clear the draft, so the panel tracks the document
   *     again — which is what makes an external Cmd+Z show up here;
   *   - no effect means no cascading render on every selection change.
   */
  const values = draft && draft.key === key ? draft.values : docValues;

  /** Write the pending values back to a specific position. */
  function commit(pos: number, next: Record<string, unknown>) {
    if (!editor || editor.isDestroyed) return;
    /*
     * setNodeAttribute, not insertContent or replaceWith.
     *
     * It mutates the attribute in place, so the NodeSelection survives and
     * React keeps the same node-view instance — no flicker, no scroll jump,
     * and the inspector doesn't tear down mid-edit. Replacing the node would
     * do all three.
     *
     * No .focus() anywhere in here: focusing the editor would pull the caret
     * out of the input the admin is currently typing into.
     */
    editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, "props", next));
    setDraft(null);
  }

  // Flush a pending edit if the panel goes away entirely (the editor closing,
  // or the mobile sheet dismissing) — a timer that never fires would silently
  // drop the last thing typed. A selection change needs no special handling:
  // the scheduled callback below captured its own `pos`, so it still lands on
  // the right block.
  const pending = useRef<{ pos: number; values: Record<string, unknown> } | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const p = pending.current;
      if (p && editor && !editor.isDestroyed) {
        editor.view.dispatch(
          editor.state.tr.setNodeAttribute(p.pos, "props", p.values),
        );
      }
    },
    [editor],
  );

  function edit(name: string, value: unknown) {
    if (!selected) return;
    const next = { ...values, [name]: value };
    setDraft({ key, values: next });

    const pos = selected.pos;
    pending.current = { pos, values: next };
    // Debounced so a typed word is one undo step rather than six, and so the
    // block re-renders at a readable rate instead of per keystroke.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
      commit(pos, next);
    }, FLUSH_DELAY_MS);
  }

  if (!selected || !def) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <span className="material-symbols-rounded text-3xl text-destiny-grey/20">
          tune
        </span>
        <p className="mt-2 text-sm font-bold text-destiny-grey/50">
          No block selected
        </p>
        <p className="mt-1 text-xs leading-relaxed text-destiny-grey/40">
          Click a block in the page to change its settings, or add one from the
          Blocks panel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-black/8 px-4 py-3">
        <span className="material-symbols-rounded text-[19px] text-destiny-orange">
          {def.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-black text-destiny-grey">
          {def.label}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-destiny-grey/45 transition hover:bg-[#f5f7fa]"
          >
            <span className="material-symbols-rounded text-lg">close</span>
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {def.fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(next) => edit(field.name, next)}
          />
        ))}
      </div>
    </div>
  );
}
