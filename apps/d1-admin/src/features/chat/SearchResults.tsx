// Search from the sidebar: matching groups, then matching messages.

import { Avatar, Empty, Loading } from "@/components/ui";
import { allGroups, useCommunities, useSearch } from "@/lib/chat";
import { whenTime } from "@/lib/format";
import { nav } from "@/lib/nav";

export function SearchResults({ query }: { query: string }) {
  const q = query.trim().toLowerCase();
  const communities = useCommunities();
  const hits = useSearch(q);
  const groups = allGroups(communities.data).filter((g) => g.name.toLowerCase().includes(q) || (g.department ?? "").toLowerCase().includes(q));

  return (
    <>
      <header className="page-header drag" data-tauri-drag-region><h1>Results for “{query.trim()}”</h1></header>
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
          {groups.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h3 className="label-caps" style={{ marginBottom: 4 }}>Groups</h3>
              {groups.map((g) => (
                <button key={g.id} className="row" onClick={() => nav.openGroup(g.id)} style={{ borderRadius: 10, display: "flex", alignItems: "center", gap: 12, padding: 8 }}>
                  <Avatar name={g.name} size={32} square ann={g.kind === "announcements"} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</span>
                </button>
              ))}
            </section>
          )}
          {q.length < 2 && <Empty title="Keep typing" sub="Search needs at least 2 letters." />}
          {q.length >= 2 && hits.isLoading && <Loading what="Searching" />}
          {(hits.data?.length ?? 0) > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h3 className="label-caps" style={{ marginBottom: 4 }}>Messages</h3>
              {hits.data!.map((h) => {
                const at = h.body.toLowerCase().indexOf(q);
                const who = h.mine ? "You" : h.sender?.displayName ?? "Former member";
                return (
                  <button key={h.id} className="row" onClick={() => nav.openGroup(h.groupId)} style={{ borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 8px" }}>
                    <Avatar name={who} size={32} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{who}</span>
                        <span className="subtle" style={{ fontSize: 12 }}>in {h.groupName} · {whenTime(h.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: "20px", color: "var(--text2)" }}>
                        {at < 0 ? h.body : (
                          <>
                            {h.body.slice(0, at)}
                            <mark style={{ background: "var(--accent-soft)", color: "var(--text)", borderRadius: 3, padding: "0 2px" }}>{h.body.slice(at, at + q.length)}</mark>
                            {h.body.slice(at + q.length)}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          )}
          {q.length >= 2 && !hits.isLoading && !hits.data?.length && groups.length === 0 && <Empty title="No results" sub="Try a different word or name." />}
        </div>
      </div>
    </>
  );
}
