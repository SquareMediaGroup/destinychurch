"use client";

import { useState } from "react";
import { FieldShell, fieldInputClass } from "@/components/admin/blocks/fields/BasicFields";
import { MAX_TAGS, normaliseTags } from "@/lib/posts";

/**
 * Tags as removable chips plus a text box: Enter or comma adds what's typed,
 * Backspace on an empty box removes the last one. `suggestions` are the tags
 * other posts already use, so "Alpha" doesn't become "alpha" and "ALPHA".
 */
export function TagsField({
  value,
  suggestions,
  onChange,
}: {
  value: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_TAGS;

  function add(raw: string) {
    const typed = raw.trim();
    if (!typed) return;
    // Reuse an existing tag's spelling when it only differs in case.
    const match = suggestions.find((s) => s.toLowerCase() === typed.toLowerCase());
    onChange(normaliseTags([...value, match ?? typed]));
    setDraft("");
  }

  const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <FieldShell label="Tags" help="For finding pages in the list. Not shown on the page." htmlFor="post-tags">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-destiny-orange/10 py-1 pl-2.5 pr-1 text-xs font-bold text-destiny-orange"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-destiny-orange/20"
              >
                <span className="material-symbols-rounded text-[14px]" aria-hidden="true">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id="post-tags"
        className={fieldInputClass}
        value={draft}
        disabled={full}
        placeholder={full ? `Up to ${MAX_TAGS} tags` : "Add a tag, then press Enter"}
        list="post-tag-suggestions"
        onChange={(e) => {
          const next = e.target.value;
          if (next.endsWith(",")) add(next.slice(0, -1));
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />
      <datalist id="post-tag-suggestions">
        {unused.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </FieldShell>
  );
}
