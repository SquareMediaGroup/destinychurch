// Search the church directory (leaders) and tick people. Used by New group
// and Add people.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { D1DirectoryEntry } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { api } from "@/lib/api";

export function PeoplePicker({ communityId, selected, onToggle, exclude = [] }: { communityId?: string; selected: D1DirectoryEntry[]; onToggle: (p: D1DirectoryEntry) => void; exclude?: string[] }) {
  const [q, setQ] = useState("");
  const results = useQuery({ queryKey: ["directory", q, communityId ?? ""], queryFn: () => api.directory(q, communityId), enabled: q.trim().length >= 2 });
  const shown = [...selected, ...(results.data ?? []).filter((p) => !selected.some((s) => s.id === p.id))].filter((p) => !exclude.includes(p.id));

  return (
    <div className="field">
      <span>People</span>
      <input className="input" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="scroll" style={{ borderRadius: 9, border: "0.5px solid var(--sep)", background: "var(--card)", maxHeight: 216, minHeight: 80 }}>
        {shown.map((p) => {
          const on = selected.some((s) => s.id === p.id);
          return (
            <button key={p.id} role="checkbox" aria-checked={on} onClick={() => onToggle(p)} className="row" style={{ width: "100%", height: 38, display: "flex", alignItems: "center", gap: 10, padding: "0 10px" }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: on ? "var(--orange)" : "var(--card)", border: on ? 0 : "1.5px solid var(--subtle)", color: "var(--on-orange)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                {on && <Icon name="check" size={11} stroke={3.4} />}
              </span>
              <Avatar name={p.displayName} size={26} />
              <span style={{ flex: 1, fontSize: 13 }}>{p.displayName}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: p.isAdult ? "var(--subtle)" : "var(--tint)" }}>{p.isAdult ? "Adult" : "Under 18"}</span>
            </button>
          );
        })}
        {shown.length === 0 && <div className="subtle" style={{ padding: 12, fontSize: 12 }}>{q.trim().length < 2 ? "Type a name to search." : results.isLoading ? "Searching…" : "No one found."}</div>}
      </div>
    </div>
  );
}
