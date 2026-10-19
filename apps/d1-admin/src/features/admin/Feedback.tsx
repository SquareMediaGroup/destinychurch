// Feedback: "Report a problem" and "Send feedback" from the app.

import { useState } from "react";
import { Empty, Loading, PageHeader, Seg } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { invalidateAdmin, useFeedback } from "@/lib/adminData";
import { whenTime } from "@/lib/format";

export function Feedback() {
  const feedback = useFeedback();
  const [tab, setTab] = useState<"new" | "done">("new");
  const [error, setError] = useState<string | null>(null);
  const rows = (feedback.data ?? []).filter((f) => f.status === tab);
  const newCount = (feedback.data ?? []).filter((f) => f.status === "new").length;

  const set = async (id: string, status: "new" | "done") => {
    setError(null);
    try {
      await admin.setFeedbackStatus(id, status);
      invalidateAdmin("feedback");
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <PageHeader title="Feedback" sub={`${newCount} new · from the phone app`}>
        <Seg label="Show" value={tab} options={[["new", "New"], ["done", "Done"]] as const} onChange={setTab} />
      </PageHeader>
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div className="page-body">
          {error && <p className="error" role="alert">{error}</p>}
          {feedback.isLoading && <Loading />}
          {rows.map((f) => (
            <article key={f.id} className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`pill ${f.kind === "problem" ? "open" : "done"}`}>{f.kind === "problem" ? "Problem" : "Idea"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{f.memberName}</span>
                <span className="subtle" style={{ fontSize: 12 }}>{whenTime(f.createdAt)}</span>
              </div>
              <p className="selectable" style={{ fontSize: 14, lineHeight: "20px", whiteSpace: "pre-wrap" }}>{f.body}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="subtle selectable" style={{ flex: 1, fontSize: 11 }}>
                  {[f.platform, f.osVersion, f.device, f.appVersion && `v${f.appVersion}`, f.errorId && `error ${f.errorId}`].filter(Boolean).join(" · ")}
                </span>
                <button className="btn sm" onClick={() => void set(f.id, f.status === "new" ? "done" : "new")}>{f.status === "new" ? "Mark done" : "Mark new"}</button>
              </div>
            </article>
          ))}
          {!feedback.isLoading && rows.length === 0 && <Empty title={tab === "new" ? "No new feedback" : "Nothing done yet"} />}
        </div>
      </div>
    </>
  );
}
