"use client";

import { useCallback, useState } from "react";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  Modal,
  TableSkeleton,
  cardClass,
  dangerBtn,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useDialog } from "@/components/DialogProvider";
import { fetchAdminArray, fetchAdminJson, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend, formatDate } from "@/lib/destinyOne/adminClient";
import { ADMIN_API, type AdminGroup } from "@/lib/destinyOne/adminTypes";

const API = `${ADMIN_API}/safeguarding`;

interface SafeguardingEvent {
  id: number;
  kind: "frozen" | "unfrozen" | "report" | "manual_freeze" | "manual_unfreeze";
  detail: string;
  adult_count: number | null;
  member_count: number | null;
  resolved_at: string | null;
  created_at: string;
  group: { id: string; name: string; state: string } | null;
}

interface Report {
  id: number;
  reason: string;
  status: "open" | "reviewing" | "closed";
  created_at: string;
  reporter: { id: string; display_name: string } | null;
  group: { id: string; name: string } | null;
  message: { id: number; body: string | null; created_at: string; deleted_at: string | null; sender: { display_name: string } | null } | null;
}

type GroupRow = AdminGroup & { communityName: string };

const EVENT_LABEL: Record<SafeguardingEvent["kind"], string> = {
  frozen: "Paused automatically",
  unfrozen: "Reopened",
  report: "Message reported",
  manual_freeze: "Paused by safeguarding",
  manual_unfreeze: "Pause lifted",
};

export default function SafeguardingPage() {
  const { confirm, prompt } = useDialog();
  const [tab, setTab] = useState<"queue" | "reports" | "groups">("queue");
  const [events, setEvents] = useState<SafeguardingEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [reviewing, setReviewing] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const [e, r, g] = await Promise.all([
      fetchAdminJson<{ events: SafeguardingEvent[] }>(`${API}/events?open=1`),
      fetchAdminJson<{ reports: Report[] }>(`${API}/reports?status=open`),
      fetchAdminArray<GroupRow>(`${API}/groups`),
    ]);
    setEvents(e.events.filter((x) => x.kind === "frozen" || x.kind === "report"));
    setReports(r.reports);
    setGroups(g);
  }, []);
  const { loading, error, setError, reload } = useAdminLoader(load);

  async function resolveEvent(id: number) {
    const res = await adminSend("PATCH", `/safeguarding/events/${id}`, {});
    if (!res.ok) setError(res.error);
    reload();
  }

  async function closeReport(id: number) {
    const resolution = await prompt({
      title: "Close this report",
      message: "A short note on what was done. It's kept with the report (and not copied into the audit log).",
      placeholder: "Spoke to the group leader; no further action.",
      confirmLabel: "Close report",
    });
    if (resolution === null) return;
    const res = await adminSend("PATCH", `/safeguarding/reports/${id}`, { status: "closed", resolution });
    if (!res.ok) setError(res.error);
    reload();
  }

  async function freeze(group: GroupRow) {
    const pausing = !(group.state === "frozen" && group.freezeKind === "manual");
    if (pausing) {
      const reason = await prompt({
        title: `Pause ${group.name}`,
        message: "Members will see the group as paused (read-only). This reason is shown to them.",
        placeholder: "Paused while the church team looks into something.",
        confirmLabel: "Pause group",
      });
      if (!reason) return;
      const res = await adminSend("POST", `/safeguarding/groups/${group.id}/freeze`, { frozen: true, reason });
      if (!res.ok) setError(res.error);
    } else {
      const ok = await confirm({ title: `Lift the pause on ${group.name}?`, message: "If the group doesn't meet the 3 people / 2 adults rule it will stay paused automatically.", confirmLabel: "Lift pause" });
      if (!ok) return;
      const res = await adminSend("POST", `/safeguarding/groups/${group.id}/freeze`, { frozen: false, reason: "" });
      if (!res.ok) setError(res.error);
    }
    reload();
  }

  const tabs = [
    { key: "queue" as const, label: `Queue (${events.length})` },
    { key: "reports" as const, label: `Reports (${reports.length})` },
    { key: "groups" as const, label: "All groups" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title="Safeguarding"
        subtitle="Reported messages, paused groups and conversation review. Opening a conversation needs a reason and is recorded in the audit log."
        back={{ href: "/admin/destiny-one", label: "Destiny One" }}
      />
      <ErrorNote>{error}</ErrorNote>

      <div className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === t.key ? "bg-destiny-grey text-white dark:bg-white dark:text-destiny-grey" : "bg-black/5 dark:bg-white/10"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : tab === "queue" ? (
        events.length === 0 ? (
          <EmptyState icon="verified_user" title="Nothing waiting" hint="Paused groups and reports will appear here." />
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className={`${cardClass} flex flex-wrap items-center gap-3 px-5 py-4`}>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{EVENT_LABEL[e.kind]}{e.group ? ` — ${e.group.name}` : ""}</p>
                  <p className="text-sm text-destiny-grey/60 dark:text-white/60">{e.detail} · {formatDate(e.created_at)}</p>
                </div>
                {e.group && (
                  <button className={ghostBtn} onClick={() => setReviewing({ id: e.group!.id, name: e.group!.name })}>Review</button>
                )}
                <button className={ghostBtn} onClick={() => resolveEvent(e.id)}>Mark handled</button>
              </li>
            ))}
          </ul>
        )
      ) : tab === "reports" ? (
        reports.length === 0 ? (
          <EmptyState icon="flag" title="No open reports" />
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className={`${cardClass} space-y-2 px-5 py-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex-1 font-bold">Report #{r.id}{r.group ? ` — ${r.group.name}` : ""}</p>
                  <span className="text-sm text-destiny-grey/55 dark:text-white/55">{formatDate(r.created_at)}</span>
                </div>
                <p className="text-sm"><span className="font-medium">Why:</span> {r.reason}</p>
                {r.message && (
                  <blockquote className="rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
                    <span className="font-bold">{r.message.sender?.display_name ?? "Former member"}:</span>{" "}
                    {r.message.body ?? "(attachment)"}
                    {r.message.deleted_at && <Badge tone="grey">Deleted by sender</Badge>}
                  </blockquote>
                )}
                <p className="text-xs text-destiny-grey/50 dark:text-white/50">Reported by {r.reporter?.display_name ?? "a former member"}</p>
                <div className="flex gap-2">
                  {r.group && <button className={ghostBtn} onClick={() => setReviewing({ id: r.group!.id, name: r.group!.name })}>Review conversation</button>}
                  <button className={primaryBtn} onClick={() => closeReport(r.id)}>Close report</button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id} className={`${cardClass} flex flex-wrap items-center gap-3 px-5 py-3`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{g.kind === "announcements" ? `${g.communityName} Announcements` : g.name}</p>
                <p className="text-sm text-destiny-grey/55 dark:text-white/55">{g.communityName} · {g.memberCount} people, {g.adultCount} adults</p>
              </div>
              {g.state !== "active" && <Badge tone={g.state === "archived" ? "grey" : "red"}>{g.state === "archived" ? "Archived" : "Paused"}</Badge>}
              <button className={ghostBtn} onClick={() => setReviewing({ id: g.id, name: g.name })}>Review</button>
              {g.state !== "archived" && (
                <button className={g.state === "frozen" && g.freezeKind === "manual" ? ghostBtn : dangerBtn} onClick={() => freeze(g)}>
                  {g.state === "frozen" && g.freezeKind === "manual" ? "Lift pause" : "Pause"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {reviewing && <TranscriptModal group={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}

interface Transcript {
  window: { from: string; to: string };
  members: { id: string; displayName: string; isAdult: boolean; role: string; joinedAt: string; leftAt: string | null; status: string }[];
  messages: {
    id: number;
    body: string | null;
    created_at: string;
    deleted_at: string | null;
    sender: { display_name: string } | null;
    attachment: { mime_type: string; url: string | null } | null;
  }[];
}

function TranscriptModal({ group, onClose }: { group: { id: string; name: string }; onClose: () => void }) {
  // The review window defaults to the last 30 days, matching the API.
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Transcript | null>(null);
  const [error, setError] = useState("");

  async function open() {
    setError("");
    const params = new URLSearchParams({ reason, from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` });
    const res = await fetch(`${API}/groups/${group.id}/transcript?${params}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? "Could not open the conversation.");
    else setData(json as Transcript);
  }

  return (
    <Modal title={`Review: ${group.name}`} onClose={onClose} size="lg">
      {!data ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-warning/15 px-4 py-3 text-sm text-warning">
            You are about to read a private conversation. Your name, the reason and the dates will be recorded in the audit log.
          </p>
          <div>
            <label className={labelClass} htmlFor="t-reason">Reason for review</label>
            <input id="t-reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Report #12 — concern raised by a parent" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="t-from">From</label>
              <input id="t-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="t-to">To</label>
              <input id="t-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <button className={ghostBtn} onClick={onClose}>Cancel</button>
            <button className={primaryBtn} disabled={reason.trim().length < 5} onClick={open}>Open conversation</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className={labelClass}>Everyone who has been in this group</p>
            <ul className="text-sm">
              {data.members.map((m) => (
                <li key={m.id}>
                  {m.displayName} — {m.isAdult ? "adult" : "under 18"}, joined {formatDate(m.joinedAt)}
                  {m.leftAt ? `, left ${formatDate(m.leftAt)}` : ""}
                  {m.role === "admin" ? " (admin)" : ""}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={labelClass}>
              Messages {formatDate(data.window.from)} to {formatDate(data.window.to)} ({data.messages.length})
            </p>
            <ol className="max-h-[50vh] space-y-2 overflow-y-auto">
              {data.messages.map((m) => (
                <li key={m.id} className="rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
                  <p className="text-xs text-destiny-grey/55 dark:text-white/55">
                    {m.sender?.display_name ?? "Former member"} · {new Date(m.created_at).toLocaleString("en-GB")}
                    {m.deleted_at ? ` · deleted ${new Date(m.deleted_at).toLocaleString("en-GB")}` : ""}
                  </p>
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                  {m.attachment && (
                    <p>
                      Attachment ({m.attachment.mime_type}){" "}
                      {m.attachment.url && <a className="font-bold text-destiny-blue" href={m.attachment.url} target="_blank" rel="noreferrer">Open</a>}
                    </p>
                  )}
                </li>
              ))}
              {data.messages.length === 0 && <li className="text-sm text-destiny-grey/55">No messages in this period.</li>}
            </ol>
          </div>
          <div className="flex justify-end">
            <button className={ghostBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
