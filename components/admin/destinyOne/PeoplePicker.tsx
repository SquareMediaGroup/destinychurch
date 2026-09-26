"use client";

// Pick people for a Destiny One community or group. Shows each person's
// verified adult / under-18 status, because the person picking is the one
// keeping the "3 people, 2 adults" rule — and shows that rule live.

import { useMemo, useState } from "react";
import { Badge, inputClass } from "@/components/admin/AdminUI";

export interface PickablePerson {
  id: string;
  displayName: string;
  isAdult: boolean;
}

export function PeoplePicker({
  people,
  selected,
  onChange,
  emptyHint = "No one to choose from yet.",
}: {
  people: PickablePerson[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.displayName.toLowerCase().includes(q)) : people;
  }, [people, query]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  if (people.length === 0) {
    return <p className="rounded-xl bg-black/5 p-4 text-sm text-destiny-grey/60 dark:bg-white/5 dark:text-white/60">{emptyHint}</p>;
  }

  return (
    <div>
      <input
        className={inputClass}
        placeholder="Search by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search people"
      />
      <ul className="mt-2 max-h-64 divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/5 dark:divide-white/10 dark:border-white/10">
        {shown.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-black/[0.03] dark:hover:bg-white/5">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <span className="flex-1 font-medium text-destiny-grey dark:text-white">{p.displayName}</span>
              <Badge tone={p.isAdult ? "blue" : "purple"}>{p.isAdult ? "Adult" : "Under 18"}</Badge>
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-3 py-3 text-sm text-destiny-grey/50 dark:text-white/50">Nobody matches.</li>}
      </ul>
    </div>
  );
}

/** The group rule, live, for whoever is choosing members. */
export function RuleCheck({ people, selected }: { people: PickablePerson[]; selected: Set<string> }) {
  const chosen = people.filter((p) => selected.has(p.id));
  const adults = chosen.filter((p) => p.isAdult).length;
  const ok = chosen.length >= 3 && adults >= 2;
  return (
    <p
      role="status"
      className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${ok ? "bg-success/10 text-success" : "bg-warning/15 text-warning"}`}
    >
      {chosen.length} {chosen.length === 1 ? "person" : "people"}, {adults} {adults === 1 ? "adult" : "adults"} chosen.{" "}
      {ok ? "Meets the rules." : "Groups need at least 3 people, including 2 verified adults."}
    </p>
  );
}
