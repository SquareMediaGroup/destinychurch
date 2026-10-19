// Audit log: every Destiny One and safeguarding action, newest first.

import { useInfiniteQuery } from "@tanstack/react-query";
import { Empty, Loading, PageHeader } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { adminKeys } from "@/lib/adminData";
import { whenTime } from "@/lib/format";

export function Audit() {
  const audit = useInfiniteQuery({
    queryKey: adminKeys.audit,
    queryFn: ({ pageParam }) => admin.audit(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextBefore,
  });
  const entries = audit.data?.pages.flatMap((p) => p.entries) ?? [];
  return (
    <>
      <PageHeader title="Audit log" sub="Every Destiny One and safeguarding action, newest first" />
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <ol style={{ listStyle: "none", margin: "0 auto", maxWidth: 860, padding: "12px 24px 40px", display: "flex", flexDirection: "column" }}>
          {entries.map((e) => (
            <li key={e.id} className="selectable" style={{ display: "grid", gridTemplateColumns: "120px 180px minmax(0, 1fr)", gap: 12, padding: "10px 4px", borderBottom: "0.5px solid var(--sep)", fontSize: 13, alignItems: "baseline" }}>
              <span className="subtle" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{whenTime(e.created_at)}</span>
              <span className="ellipsis" style={{ fontWeight: 600 }}>{e.actor_email ?? "System"}</span>
              <span style={{ color: "var(--text2)" }}>{e.summary}</span>
            </li>
          ))}
        </ol>
        {audit.isLoading && <Loading />}
        {audit.error && <p className="error" style={{ textAlign: "center" }}>{errorText(audit.error)}</p>}
        {!audit.isLoading && entries.length === 0 && !audit.error && <Empty title="Nothing logged yet" />}
        {audit.hasNextPage && (
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 32 }}>
            <button className="btn" disabled={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{audit.isFetchingNextPage ? "Loading…" : "Load more"}</button>
          </div>
        )}
      </div>
    </>
  );
}
