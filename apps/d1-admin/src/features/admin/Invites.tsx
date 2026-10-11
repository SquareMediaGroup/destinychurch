// Invites: invite someone by email, resend, revoke.

import { useState } from "react";
import { LEADER_ROLE_LABELS, type AdminInvite, type LeaderRole } from "@destiny/shared";
import { Empty, Loading, PageHeader, Seg } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { invalidateAdmin, useAdminCommunities, useInvites } from "@/lib/adminData";
import { longDate, shortTime } from "@/lib/format";

function NewInvite({ onDone }: { onDone: () => void }) {
  const communities = useAdminCommunities();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState<"adult" | "child">("adult");
  const [dob, setDob] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [roles, setRoles] = useState<LeaderRole[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = /^\S+@\S+\.\S+$/.test(email.trim()) && name.trim().length >= 2;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await admin.createInvites([{ email: email.trim(), name: name.trim(), adult: age === "adult", dateOfBirth: dob || null, communityIds: picked, roles: age === "adult" ? roles : [] }]);
      if (res.failed.length) setError(res.failed[0].error);
      else {
        invalidateAdmin("invites");
        onDone();
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700 }}>New invite</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field"><span>Full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field"><span>Age</span><Seg label="Age" value={age} options={[["adult", "Adult"], ["child", "Under 18"]] as const} onChange={setAge} /></div>
        {age === "child" && <label className="field"><span>Date of birth, if known</span><input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ width: 170 }} /></label>}
        {age === "adult" && (
          <div className="field">
            <span>Leader role <span style={{ fontWeight: 400, color: "var(--subtle)" }}>Optional</span></span>
            <div style={{ display: "flex", gap: 6 }}>
              {(Object.keys(LEADER_ROLE_LABELS) as LeaderRole[]).map((r) => (
                <button key={r} className="chip outline" role="checkbox" aria-checked={roles.includes(r)} onClick={() => setRoles((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]))}>{LEADER_ROLE_LABELS[r]}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="field">
        <span>Communities</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(communities.data ?? []).filter((c) => !c.archived).map((c) => (
            <button key={c.id} className="chip outline" role="checkbox" aria-checked={picked.includes(c.id)} onClick={() => setPicked((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))}>{c.name}</button>
          ))}
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={onDone}>Cancel</button>
        <button className="btn primary" disabled={!ok || busy} onClick={() => void send()}>{busy ? "Sending…" : "Send invite"}</button>
      </div>
    </div>
  );
}

const PILL: Record<AdminInvite["status"], string> = { pending: "open", accepted: "ok", revoked: "done", expired: "done" };

export function Invites() {
  const invites = useInvites();
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const rows = (invites.data ?? []).filter((i) => tab === "all" || i.status === "pending");

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      invalidateAdmin("invites");
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <PageHeader title="Invites" sub="An invite lets someone in without an access request">
        <Seg label="Show" value={tab} options={[["pending", "Waiting"], ["all", "All"]] as const} onChange={setTab} />
        <button className="btn primary" onClick={() => setAdding(true)} disabled={adding}>New invite</button>
      </PageHeader>
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div className="page-body">
          {adding && <NewInvite onDone={() => setAdding(false)} />}
          {error && <p className="error" role="alert">{error}</p>}
          {invites.isLoading && <Loading />}
          {rows.map((i) => (
            <div key={i.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{i.displayName} <span className="subtle" style={{ fontWeight: 400 }}>· {i.isAdult ? "Adult" : "Under 18"}</span></span>
                <span className="subtle ellipsis selectable" style={{ fontSize: 12 }}>
                  {i.email} · sent {shortTime(i.lastSentAt ?? i.createdAt)}{i.status === "pending" ? ` · expires ${longDate(i.expiresAt)}` : ""}
                </span>
              </div>
              <span className={`pill ${PILL[i.status]}`}>{i.status[0].toUpperCase() + i.status.slice(1)}</span>
              {(i.status === "pending" || i.status === "expired") && <button className="btn sm" onClick={() => void act(() => admin.resendInvite(i.id))}>Resend</button>}
              {i.status === "pending" && <button className="btn sm danger-text" onClick={() => void act(() => admin.revokeInvite(i.id))}>Revoke</button>}
            </div>
          ))}
          {!invites.isLoading && rows.length === 0 && !adding && <Empty title="No invites waiting" sub="Send one with New invite." />}
        </div>
      </div>
    </>
  );
}
