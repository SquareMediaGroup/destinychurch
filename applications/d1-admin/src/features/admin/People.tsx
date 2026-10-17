// People: everyone in Destiny One, with a detail panel. Destiny One Admins
// set leader roles; Safeguarding Admins restrict, suspend and reinstate.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LEADER_ROLE_LABELS, type AdminMember, type LeaderRole } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, Empty, Loading, PageHeader, Seg } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { adminKeys, invalidateAdmin, useMembers } from "@/lib/adminData";
import { dateAndTime, longDate, plural } from "@/lib/format";
import { nav, useNav } from "@/lib/nav";
import { useReady } from "@/lib/session";

type Filter = "All" | "Adults" | "Under 18" | "Leaders" | "Restricted";

function restricted(m: AdminMember): boolean {
  return !!m.postingRestrictedUntil && new Date(m.postingRestrictedUntil) > new Date();
}

function statusOf(m: AdminMember): { label: string; cls: string } {
  if (m.status === "suspended") return { label: "Suspended", cls: "alert" };
  if (restricted(m)) return { label: "Restricted", cls: "alert" };
  if (m.status === "pending") return { label: "Pending", cls: "open" };
  return { label: "Active", cls: "ok" };
}

function Detail({ id }: { id: string }) {
  const { roles } = useReady();
  const detail = useQuery({ queryKey: adminKeys.member(id), queryFn: () => admin.member(id) });
  const [mode, setMode] = useState<null | "restrict" | "suspend">(null);
  const [why, setWhy] = useState("");
  const [days, setDays] = useState<"1" | "7" | "30">("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setMode(null);
    setWhy("");
    setError(null);
  }, [id]);

  const m = detail.data?.member;
  if (detail.isLoading) return <Loading />;
  if (!m) return <Empty title="Not found" />;

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMode(null);
      setWhy("");
      invalidateAdmin("members");
      invalidateAdmin("member", id);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (r: LeaderRole) => {
    const next = m.roles.includes(r) ? m.roles.filter((x) => x !== r) : [...m.roles, r];
    void act(() => admin.updateMember(id, { roles: next }));
  };
  const st = statusOf(m);

  return (
    <div style={{ padding: "20px 22px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={m.displayName} size={48} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{m.displayName}</span>
          <span className="subtle ellipsis selectable" style={{ fontSize: 12 }}>{m.email ?? "No email"}</span>
        </div>
        <span className={`pill ${st.cls}`}>{st.label}</span>
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Age</dt><dd style={{ color: m.isAdult ? undefined : "var(--tint)", fontWeight: 600 }}>{m.isAdult ? "Adult" : m.adultOn ? `Under 18 · 18 on ${longDate(m.adultOn)}` : "Under 18"}</dd></div>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>ChurchSuite</dt><dd>{m.churchsuiteLinked ? "Linked" : "Not linked"}</dd></div>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Verified</dt><dd>{m.verifiedAt ? `${longDate(m.verifiedAt)}${m.verificationSource ? ` · ${m.verificationSource}` : ""}` : "Not yet"}</dd></div>
        <div><dt className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Joined</dt><dd>{longDate(m.createdAt)}</dd></div>
      </dl>
      {restricted(m) && <div className="note">Can read but not post until {dateAndTime(m.postingRestrictedUntil!)}.</div>}

      {roles.destinyOneAdmin && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h3 className="label-caps">Leader roles</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(Object.keys(LEADER_ROLE_LABELS) as LeaderRole[]).map((r) => (
              <button key={r} className="chip outline" role="checkbox" aria-checked={m.roles.includes(r)} disabled={busy || (!m.isAdult && !m.roles.includes(r))} onClick={() => toggleRole(r)}>{LEADER_ROLE_LABELS[r]}</button>
            ))}
          </div>
          {!m.isAdult && <span className="subtle" style={{ fontSize: 11 }}>Leader roles are for adults only.</span>}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h3 className="label-caps">{plural(detail.data!.groups.length, "group")}</h3>
        {detail.data!.groups.map((g) => (
          <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
            <span>{g.name}{g.state === "frozen" ? " (paused)" : ""}</span>
            {g.role === "admin" && <span className="tag-admin">Admin</span>}
          </div>
        ))}
        {detail.data!.communities.length > 0 && <span className="subtle" style={{ fontSize: 12, marginTop: 4 }}>Communities: {detail.data!.communities.map((c) => c.name).join(", ")}</span>}
      </section>

      {roles.safeguardingAdmin && m.status !== "pending" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 className="label-caps">Safeguarding</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {restricted(m) ? (
              <button className="btn" disabled={busy} onClick={() => void act(() => admin.liftRestriction(id))}>Lift restriction</button>
            ) : (
              m.status === "active" && <button className="btn danger-text" onClick={() => setMode("restrict")}>Restrict posting</button>
            )}
            {m.status === "suspended" ? (
              <button className="btn" onClick={() => setMode("suspend")}>Reinstate</button>
            ) : (
              <button className="btn danger-text" onClick={() => setMode("suspend")}>Suspend</button>
            )}
          </div>
          {mode && (
            <div className="note" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "restrict" && <Seg label="Restriction length" value={days} options={[["1", "1 day"], ["7", "7 days"], ["30", "30 days"]] as const} onChange={setDays} />}
              {mode === "suspend" && <span style={{ fontSize: 12 }}>{m.status === "suspended" ? "They'll be able to use Destiny One again." : "They drop out of every group's counts at once, so a group can pause."}</span>}
              <input className="input" placeholder="Reason, for the audit log" value={why} onChange={(e) => setWhy(e.target.value)} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setMode(null)}>Cancel</button>
                <button
                  className="btn danger"
                  disabled={why.trim().length < 3 || busy}
                  onClick={() => void act(() => (mode === "restrict" ? admin.restrict(id, Number(days) as 1 | 7 | 30, why.trim()) : admin.suspend(id, m.status !== "suspended", why.trim())))}
                >
                  {mode === "restrict" ? "Restrict" : m.status === "suspended" ? "Reinstate" : "Suspend"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

export function People() {
  const { view } = useNav();
  const members = useMembers();
  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const selected = view.kind === "admin" && typeof view.id === "string" ? view.id : null;

  const match: Record<Filter, (m: AdminMember) => boolean> = {
    All: () => true,
    Adults: (m) => m.isAdult,
    "Under 18": (m) => !m.isAdult,
    Leaders: (m) => m.roles.length > 0,
    Restricted: (m) => restricted(m) || m.status === "suspended",
  };
  const rows = (members.data ?? [])
    .filter((m) => m.status !== "pending")
    .filter(match[filter])
    .filter((m) => !q.trim() || m.displayName.toLowerCase().includes(q.trim().toLowerCase()) || (m.email ?? "").includes(q.trim().toLowerCase()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const cols = "minmax(200px, 2fr) 90px 110px 80px 100px 100px";
  return (
    <>
      <PageHeader title="People" sub={`${plural(rows.length, "person", "people")}`}>
        <input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(match) as Filter[]).map((f) => <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}
        </div>
      </PageHeader>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div className="scroll" style={{ flex: 1, minWidth: 0, padding: "12px 20px 40px" }}>
          {members.isLoading && <Loading />}
          {members.error && <p className="error">{errorText(members.error)}</p>}
          <div role="table" aria-label="People" style={{ minWidth: 700, display: "flex", flexDirection: "column" }}>
            <div role="row" className="label-caps" style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 10px", borderBottom: "0.5px solid var(--sep)" }}>
              <span role="columnheader">Name</span><span role="columnheader">Age</span><span role="columnheader">Role</span><span role="columnheader">Groups</span><span role="columnheader">ChurchSuite</span><span role="columnheader">Status</span>
            </div>
            {rows.map((m) => {
              const st = statusOf(m);
              const role = m.roles.length ? LEADER_ROLE_LABELS[m.roles[0]] : "Member";
              return (
                <button
                  key={m.id}
                  role="row"
                  className="row"
                  onClick={() => nav.openAdmin("people", m.id)}
                  aria-current={selected === m.id ? "true" : undefined}
                  style={{ display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "8px 10px", borderBottom: "0.5px solid var(--sep)", borderRadius: 6, background: selected === m.id ? "var(--sel)" : "transparent" }}
                >
                  <span role="cell" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500, minWidth: 0 }}><Avatar name={m.displayName} size={28} /><span className="ellipsis">{m.displayName}</span></span>
                  <span role="cell" style={{ fontSize: 12, fontWeight: 600, color: m.isAdult ? "var(--subtle)" : "var(--tint)" }}>{m.isAdult ? "Adult" : "Under 18"}</span>
                  <span role="cell" style={{ fontSize: 12 }}>{role}</span>
                  <span role="cell" className="muted" style={{ fontSize: 12 }}>{m.groupCount}</span>
                  <span role="cell" className="muted" style={{ fontSize: 12 }}>{m.churchsuiteLinked ? "Linked" : "Not linked"}</span>
                  <span role="cell"><span className={`pill ${st.cls}`}>{st.label}</span></span>
                </button>
              );
            })}
          </div>
          {!members.isLoading && rows.length === 0 && <Empty title="No one here" />}
        </div>
        {selected && (
          <aside className="scroll" aria-label="Person" style={{ width: 340, flex: "none", borderLeft: "0.5px solid var(--sep)", background: "var(--side)", position: "relative" }}>
            <button className="ib sm" aria-label="Close" onClick={() => nav.openAdmin("people")} style={{ position: "absolute", top: 10, right: 10, color: "var(--subtle)" }}><Icon name="x" size={13} stroke={2.4} /></button>
            <Detail id={selected} />
          </aside>
        )}
      </div>
    </>
  );
}
