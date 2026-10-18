// Reports: the safeguarding queue. Safeguarding Admins only.
//
// The report shows the reported message. Reading the conversation around it
// is the audited transcript: it needs the Safeguarding Admin role itself and a
// reason, which the audit log keeps with who opened it.

import { useEffect, useState } from "react";
import type { AdminReport, AdminReportStatus, AdminTranscript } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, Empty, Loading, PageHeader, Seg } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { adminKeys, invalidateAdmin, useReports } from "@/lib/adminData";
import { clockTime, plural, whenTime } from "@/lib/format";
import { nav, useNav } from "@/lib/nav";
import { queryClient } from "@/lib/queryClient";
import { useReady } from "@/lib/session";

const TABS: [AdminReportStatus, string][] = [["open", "Open"], ["reviewing", "In review"], ["closed", "Closed"]];

function statusPill(r: AdminReport) {
  if (r.escalated_at && r.status !== "closed") return <span className="pill alert">Escalated</span>;
  if (r.status === "open") return <span className="pill open">Open</span>;
  if (r.status === "reviewing") return <span className="pill open">In review</span>;
  return <span className="pill done">Closed</span>;
}

/** Splits "Bullying or harassment: their note" into the category and the note. */
function splitReason(reason: string): { title: string; note: string | null } {
  const i = reason.indexOf(": ");
  if (i > 0 && i < 40) return { title: reason.slice(0, i), note: reason.slice(i + 2) };
  return reason.length <= 40 ? { title: reason, note: null } : { title: "Reported message", note: reason };
}

function Context({ report }: { report: AdminReport }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<AdminTranscript | null>(null);
  useEffect(() => {
    setTranscript(null);
    setReason("");
    setError(null);
  }, [report.id]);

  const msg = report.message;
  if (!msg) return null;

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      const at = new Date(msg.created_at).getTime();
      const t = await admin.transcript(report.group_id, {
        reason: reason.trim(),
        from: new Date(at - 2 * 3600_000).toISOString(),
        to: new Date(at + 2 * 3600_000).toISOString(),
      });
      setTranscript(t);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (transcript) {
    return (
      <div className="card" style={{ borderRadius: 12, padding: 6 }}>
        {transcript.messages.map((m) => {
          const hit = m.id === msg.id;
          return (
            <div key={m.id} style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 8, background: hit ? "var(--accent-soft)" : "transparent", boxShadow: hit ? "inset 0 0 0 1px var(--orange)" : "none" }}>
              <Avatar name={m.sender?.display_name ?? "?"} size={28} />
              <div className="selectable" style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{m.sender?.display_name ?? "Former member"}</span>
                  <span className="subtle" style={{ fontSize: 11 }}>{clockTime(m.created_at)}{m.deleted_at ? " · deleted" : ""}{m.edited_at ? " · edited" : ""}</span>
                </div>
                <span style={{ fontSize: 13, lineHeight: "18px", whiteSpace: "pre-wrap" }}>{m.body ?? (m.attachment ? "File" : "")}</span>
              </div>
            </div>
          );
        })}
        <p className="subtle" style={{ fontSize: 11, padding: "6px 10px" }}>Two hours either side. Opening this was written to the audit log.</p>
      </div>
    );
  }

  return (
    <div className="note" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Read the conversation around it</span>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" placeholder="Why are you opening it? (written to the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="btn dark" disabled={reason.trim().length < 5 || busy} onClick={() => void open()}><Icon name="eye" size={15} /> Open</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

function ReportDetail({ report }: { report: AdminReport }) {
  const { roles } = useReady();
  const [mode, setMode] = useState<null | "remove" | "restrict">(null);
  const [why, setWhy] = useState("");
  const [days, setDays] = useState<"1" | "7" | "30">("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    setMode(null);
    setWhy("");
    setError(null);
    setDone(null);
  }, [report.id]);

  const { title, note } = splitReason(report.reason);
  const msg = report.message;
  const sender = msg?.sender;
  const closed = report.status === "closed";

  const act = async (fn: () => Promise<unknown>, outcome: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setDone(outcome);
      setMode(null);
      setWhy("");
      invalidateAdmin("reports");
      invalidateAdmin("members");
      invalidateAdmin("audit");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ flex: 1, fontSize: 20, fontWeight: 700 }}>{title}</h2>
        {statusPill(report)}
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px 24px" }}>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Sender</dt><dd style={{ fontSize: 13, fontWeight: 600 }}>{sender?.display_name ?? "Former member"}</dd></div>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Reported by</dt><dd style={{ fontSize: 13 }}>{report.reporter?.display_name ?? "Former member"} <span className="subtle">· not shown to the sender</span></dd></div>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Group</dt><dd style={{ fontSize: 13 }}>{report.group?.name ?? "Deleted group"}</dd></div>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Reported</dt><dd style={{ fontSize: 13 }}>{whenTime(report.created_at)}</dd></div>
      </dl>
      {note && (
        <div className="note" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Reporter's note</span>
          <span className="selectable">{note}</span>
        </div>
      )}
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 className="label-caps">The message</h3>
        {msg ? (
          <div className="card" style={{ borderRadius: 12, padding: "10px 12px", display: "flex", gap: 10 }}>
            <Avatar name={sender?.display_name ?? "?"} size={28} />
            <div className="selectable" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="subtle" style={{ fontSize: 11 }}>{whenTime(msg.created_at)}{msg.deleted_at ? (msg.deleted_by_admin ? " · removed by safeguarding" : " · deleted by sender, kept for review") : ""}</span>
              <span style={{ fontSize: 14, lineHeight: "20px", whiteSpace: "pre-wrap" }}>{msg.body ?? "No text (a file or poll)"}</span>
            </div>
          </div>
        ) : (
          <p className="subtle">The message is no longer held.</p>
        )}
        {msg && roles.transcriptReader && <Context report={report} />}
      </section>

      {done && (
        <div style={{ borderRadius: 10, background: "var(--accent-soft)", padding: "10px 14px", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="check" size={16} stroke={2.4} color="var(--tint)" />
          {done}
        </div>
      )}
      {closed && report.resolution && !done && <div className="note">{report.resolution}</div>}

      {!closed && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button className="btn" disabled={busy} onClick={() => void act(() => admin.resolveReport(report.id, "closed", "Dismissed: no action needed."), "Dismissed. No action needed.")}>Dismiss</button>
            {msg && !msg.deleted_by_admin && <button className="btn" aria-pressed={mode === "remove"} onClick={() => setMode(mode === "remove" ? null : "remove")}>Remove message</button>}
            {sender && <button className="btn danger-text" aria-pressed={mode === "restrict"} onClick={() => setMode(mode === "restrict" ? null : "restrict")}>Restrict sender</button>}
            {report.status === "open" && <button className="btn" disabled={busy} onClick={() => void act(() => admin.resolveReport(report.id, "reviewing"), "Marked as in review.")}>Mark in review</button>}
            <span style={{ flex: 1 }} />
            {!report.escalated_at && (
              <button className="btn primary" disabled={busy} onClick={() => void act(() => admin.escalateReport(report.id), "Escalated to the Designated Safeguarding Lead. Every Safeguarding Admin has been emailed.")}>Escalate to DSL</button>
            )}
          </div>
          {mode && (
            <div className="note" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "restrict" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13 }}>{sender?.display_name} can read but not post for</span>
                  <Seg label="Restriction length" value={days} options={[["1", "1 day"], ["7", "7 days"], ["30", "30 days"]] as const} onChange={setDays} />
                </div>
              )}
              <label className="field">
                <span>Reason, for the audit log</span>
                <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder={mode === "remove" ? "Why it's being removed" : "Why they're being restricted"} />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setMode(null)}>Cancel</button>
                {mode === "remove" ? (
                  <button className="btn danger" disabled={why.trim().length < 3 || busy} onClick={() => void act(async () => { await admin.removeMessage(msg!.id, why.trim()); await admin.resolveReport(report.id, "closed", `Message removed: ${why.trim()}`); }, "Message removed for everyone. A copy is kept for safeguarding.")}>Remove for everyone</button>
                ) : (
                  <button className="btn danger" disabled={why.trim().length < 3 || busy} onClick={() => void act(async () => { await admin.restrict(sender!.id, Number(days) as 1 | 7 | 30, why.trim()); if (report.status === "open") await admin.resolveReport(report.id, "reviewing"); }, `${sender!.display_name} can read but not post for ${plural(Number(days), "day")}.`)}>Restrict</button>
                )}
              </div>
            </div>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          {report.status === "reviewing" && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" disabled={busy} onClick={() => void act(() => admin.resolveReport(report.id, "closed", "Closed after review."), "Closed.")}>Close report</button>
            </div>
          )}
        </>
      )}
      <p className="subtle" style={{ fontSize: 12 }}>Every action is written to the audit log. The original message is kept for safeguarding even if it's removed.</p>
    </div>
  );
}

export function Reports() {
  const { view } = useNav();
  const [tab, setTab] = useState<AdminReportStatus>("open");
  const reports = useReports(tab);
  const openCount = useReports("open").data?.length ?? 0;
  const list = reports.data ?? [];
  const selectedId = view.kind === "admin" && typeof view.id === "number" ? view.id : list[0]?.id;
  const selected = list.find((r) => r.id === selectedId) ?? list[0] ?? null;

  useEffect(() => {
    void queryClient.prefetchQuery({ queryKey: adminKeys.reports("reviewing"), queryFn: () => admin.reports("reviewing") });
  }, []);

  return (
    <>
      <PageHeader title="Reports" sub={`${openCount} open · only the safeguarding team sees these`}>
        <Seg label="Show" value={tab} options={TABS} onChange={(t) => { setTab(t); nav.openAdmin("reports"); }} />
      </PageHeader>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div className="scroll" style={{ width: 330, flex: "none", borderRight: "0.5px solid var(--sep)", padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {reports.isLoading && <Loading />}
          {reports.error && <p className="error" style={{ padding: 12 }}>{errorText(reports.error)}</p>}
          {list.map((r) => {
            const current = r.id === selected?.id;
            return (
              <button key={r.id} className="row" onClick={() => nav.openAdmin("reports", r.id)} aria-current={current ? "true" : undefined} style={{ borderRadius: 10, background: current ? "var(--sel)" : "transparent", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, width: "100%" }}>
                  <span className="ellipsis" style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{splitReason(r.reason).title}</span>
                  <span className="subtle" style={{ fontSize: 11 }}>{whenTime(r.created_at)}</span>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{r.message?.sender?.display_name ?? "Former member"} in {r.group?.name ?? "a deleted group"}</span>
                <span className="subtle ellipsis" style={{ fontSize: 12, width: "100%" }}>{r.message?.body ? `“${r.message.body}”` : "No text"}</span>
                <span style={{ marginTop: 3 }}>{statusPill(r)}</span>
              </button>
            );
          })}
          {!reports.isLoading && list.length === 0 && <div className="subtle" style={{ padding: "48px 16px", textAlign: "center" }}>Nothing here. All caught up.</div>}
        </div>
        <div className="scroll" style={{ flex: 1, minWidth: 0 }}>
          {selected ? <ReportDetail key={selected.id} report={selected} /> : !reports.isLoading && <Empty title="No report selected" />}
        </div>
      </div>
    </>
  );
}
