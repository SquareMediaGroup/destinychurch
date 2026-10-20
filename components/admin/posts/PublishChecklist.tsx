"use client";

import type { ChecklistItem } from "@/lib/postChecklist";

/** The pre-publish checklist, shown at the top of Page settings. */
export function PublishChecklist({ items }: { items: ChecklistItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destiny-green/10 px-3 py-2.5 text-xs font-bold text-destiny-green">
        <span className="material-symbols-rounded text-[17px]" aria-hidden="true">task_alt</span>
        Ready to publish
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-amber-500/10 px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
        <span className="material-symbols-rounded text-[17px]" aria-hidden="true">checklist</span>
        Before you publish
      </p>
      <ul className="space-y-1 pl-6 text-xs text-destiny-grey/70 dark:text-white/70">
        {items.map((item) => (
          <li key={item.id} className="list-disc">
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
