"use client";

import { useCallback, useState } from "react";
import { PageHeader, Badge, EmptyState, ErrorNote, FilterChips, TableSkeleton, cardClass, ghostBtn } from "@/components/admin/AdminUI";
import { fetchAdminArray, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend, formatDate } from "@/lib/destinyOne/adminClient";
import { ADMIN_API, type AdminFeedback } from "@/lib/destinyOne/adminTypes";

type Filter = "new" | "done" | "all";

/** "iOS 26.1 · iPhone 17 · app 1.0.0", from whatever the app sent. */
function deviceLine(f: AdminFeedback): string {
  const os = f.platform ? [f.platform === "ios" ? "iOS" : f.platform === "android" ? "Android" : f.platform, f.osVersion].filter(Boolean).join(" ") : null;
  return [os, f.device, f.appVersion ? `app ${f.appVersion}` : null].filter(Boolean).join(" · ");
}

export default function AppFeedbackPage() {
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [filter, setFilter] = useState<Filter>("new");

  const load = useCallback(async () => {
    setItems(await fetchAdminArray<AdminFeedback>(`${ADMIN_API}/feedback`));
  }, []);
  const { loading, error, setError } = useAdminLoader(load);

  async function setStatus(f: AdminFeedback, status: AdminFeedback["status"]) {
    const res = await adminSend<AdminFeedback>("PATCH", `/feedback/${f.id}`, { status });
    if (!res.ok) return setError(res.error);
    setItems((list) => list.map((x) => (x.id === f.id ? res.data : x)));
  }

  const counts = { new: items.filter((f) => f.status === "new").length, done: items.filter((f) => f.status === "done").length };
  const shown = filter === "all" ? items : items.filter((f) => f.status === filter);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title="App feedback"
        subtitle="Problems and ideas people sent from Destiny One's Profile tab. If anything here is a safeguarding concern, pass it to the safeguarding team straight away."
        back={{ href: "/admin/destiny-one", label: "Destiny One" }}
      />
      <ErrorNote>{error}</ErrorNote>

      <div className="mb-4">
        <FilterChips
          label="Show"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            { value: "new", label: "New", count: counts.new },
            { value: "done", label: "Done", count: counts.done },
            { value: "all", label: "All", count: items.length },
          ]}
        />
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="feedback"
          title={filter === "new" ? "Nothing new" : "No feedback here"}
          hint="Problems and ideas from the app appear here, and in your notifications."
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((f) => (
            <li key={f.id} className={`${cardClass} flex flex-wrap items-start gap-4 p-5`}>
              <div className="min-w-0 flex-1 basis-64 [overflow-wrap:anywhere]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={f.kind === "problem" ? "red" : "blue"}>{f.kind === "problem" ? "Problem" : "Idea"}</Badge>
                  {f.status === "done" && <Badge tone="green">Done</Badge>}
                  <span className="text-sm text-destiny-grey/55 dark:text-white/55">
                    {f.memberName} · {formatDate(f.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-destiny-grey dark:text-white">{f.body}</p>
                {(deviceLine(f) || f.errorId) && (
                  <p className="mt-2 text-xs text-destiny-grey/55 dark:text-white/55">
                    {deviceLine(f)}
                    {f.errorId && (
                      <>
                        {deviceLine(f) ? " · " : ""}
                        Error ID <span className="font-mono select-all">{f.errorId}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <button className={ghostBtn} onClick={() => setStatus(f, f.status === "new" ? "done" : "new")}>
                {f.status === "new" ? "Mark as done" : "Reopen"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
