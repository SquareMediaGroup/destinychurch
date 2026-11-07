"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BLOCK_LIST } from "@/components/blocks/registry";
import type { AnyBlockDefinition } from "@/components/blocks/types";
import { insertBlock } from "./insertBlock";

/**
 * Type "/" at the start of an empty line to add a block without leaving the
 * keyboard (the Notion / WordPress / Ghost pattern). Arrow keys move, Enter or
 * Tab inserts, Escape closes; typing after the slash filters.
 *
 * It sits beside the editor rather than inside the formatting toolbar, which
 * keeps the rule that blocks are reached from outside the toolbar. It's driven
 * entirely by the editor's own state: the menu is open whenever the line the
 * cursor is on reads exactly "/" + letters, so there's no separate mode to get
 * stuck in.
 */
export function SlashMenu({ editor }: { editor: Editor | null }) {
  const [query, setQuery] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [active, setActive] = useState(0);
  // Escape closes the menu for this "/…" run until the line changes shape.
  const dismissed = useRef<string | null>(null);
  const lastQuery = useRef<string | null>(null);

  const matches = useMemo(() => {
    if (query === null) return [];
    const needle = query.toLowerCase();
    return BLOCK_LIST.filter(
      (b) => !needle || b.label.toLowerCase().includes(needle) || b.name.includes(needle),
    ).slice(0, 8);
  }, [query]);

  // Watch the line the cursor is on.
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { state, view } = editor;
      const { $from, empty } = state.selection;
      const parent = $from.parent;
      const text = parent.type.name === "paragraph" ? parent.textContent : "";
      const match = empty && $from.parentOffset === text.length ? /^\/([a-z-]*)$/i.exec(text) : null;
      if (!match || dismissed.current === `${$from.before()}:${text}`) {
        if (!match) dismissed.current = null;
        lastQuery.current = null;
        setQuery(null);
        return;
      }
      const rect = view.coordsAtPos($from.pos);
      setCoords({ top: rect.bottom + 6, left: rect.left });
      if (lastQuery.current !== match[1]) setActive(0);
      lastQuery.current = match[1];
      setQuery(match[1]);
    };
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  function choose(def: AnyBlockDefinition) {
    if (!editor) return;
    const { $from } = editor.state.selection;
    // Clear the "/query" text, leaving an empty paragraph insertBlock replaces.
    editor
      .chain()
      .focus()
      .deleteRange({ from: $from.start(), to: $from.end() })
      .run();
    insertBlock(editor, def);
    setQuery(null);
  }

  // Keys while open. Captured on the editor's parent, so they're handled
  // before ProseMirror's own listener on the editable itself sees them (Enter
  // would otherwise also split the paragraph).
  const latest = useRef({ matches, active, choose });
  useEffect(() => {
    latest.current = { matches, active, choose };
  });
  useEffect(() => {
    if (!editor || query === null) return;
    const dom = editor.view.dom.parentElement;
    if (!dom) return;
    const onKey = (e: KeyboardEvent) => {
      const { matches: list, active: index, choose: pick } = latest.current;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (list.length) setActive((index + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length);
      } else if ((e.key === "Enter" || e.key === "Tab") && list.length) {
        e.preventDefault();
        e.stopPropagation();
        pick(list[index] ?? list[0]);
      } else if (e.key === "Escape") {
        // Don't let Escape close the whole editor while the menu is open.
        e.preventDefault();
        e.stopPropagation();
        const { $from } = editor.state.selection;
        dismissed.current = `${$from.before()}:${$from.parent.textContent}`;
        setQuery(null);
      }
    };
    dom.addEventListener("keydown", onKey, true);
    return () => dom.removeEventListener("keydown", onKey, true);
  }, [editor, query]);

  if (query === null || !coords) return null;

  return (
    <div
      role="listbox"
      aria-label="Add a block"
      style={{ top: coords.top, left: coords.left }}
      className="fixed z-[60] w-64 overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-destiny-grey-800"
    >
      {matches.length === 0 ? (
        <p className="px-3 py-2 text-xs text-destiny-grey/50 dark:text-white/50">No block called “{query}”</p>
      ) : (
        matches.map((def, i) => (
          <button
            key={def.name}
            type="button"
            role="option"
            aria-selected={i === active}
            // mousedown, not click: a click would blur the editor first.
            onMouseDown={(e) => {
              e.preventDefault();
              choose(def);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${
              i === active ? "bg-destiny-orange/10" : ""
            }`}
          >
            <span className="material-symbols-rounded text-lg text-destiny-orange" aria-hidden="true">
              {def.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-destiny-grey dark:text-white">{def.label}</span>
              <span className="block truncate text-[11px] text-destiny-grey/50 dark:text-white/50">
                {def.description}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}
