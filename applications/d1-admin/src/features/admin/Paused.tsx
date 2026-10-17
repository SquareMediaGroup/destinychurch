// Paused groups: groups that dropped below 3 people or 2 adults (paused by
// themselves) or were paused by safeguarding. Safeguarding Admins see the
// list; adding people needs the Destiny One Admin role as well.

import { useMemo, useState } from "react";
import { MIN_GROUP_ADULTS, MIN_GROUP_MEMBERS, type AdminSafeguardingGroup } from "@destiny/shared";
import { Avatar, Empty, Loading, PageHeader, RuleBox } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { invalidateAdmin, useAdminGroup, useMembers, usePausedGroups } from "@/lib/adminData";
import { findGroup, useCommunities } from "@/lib/chat";
import { nav } from "@/lib/nav";
import { useReady } from "@/lib/session";

function AddAdults({ group }: { group: AdminSafeguardingGroup }) {
  const detail = useAdminGroup(group.id);
  const members = useMembers();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inGroup = useMemo(() => new Set((detail.data?.members ?? []).map((m) => m.id)), [detail.data]);
  const suggestions = (members.data ?? [])
    .filter((m) => m.status === "active" && m.isAdult && !inGroup.has(m.id))
    .filter((m) => !q.trim() || m.displayName.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 8);

  const add = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await admin.addGroupMembers(group.id, [id]);
      invalidateAdmin("group", group.id);
      invalidateAdmin("paused");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {detail.data && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {detail.data.members.map((p) => (
            <span key={p.id} style={{ height: 26, borderRadius: 13, background: "var(--fill)", display: "flex", alignItems: "center", gap: 6, padding: "0 10px 0 4px", fontSize: 12 }}>
              <Avatar name={p.displayName} size={20} />
              {p.displayName}
              <span style={{ fontWeight: 600, color: p.isAdult ? "var(--subtle)" : "var(--tint)" }}>{p.isAdult ? "Adult" : "Under 18"}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Add an adult</span>
        <input className="input" placeholder="Search active adults" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {suggestions.map((m) => (
            <button key={m.id} className="chip outline" disabled={busy === m.id} onClick={() => void add(m.id)}>+ {m.displayName}</button>
          ))}
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}

function PausedCard({ g }: { g: AdminSafeguardingGroup }) {
  const { roles } = useReady();
  const communities = useCommunities();
  const mine = !!findGroup(communities.data, g.id);
  const ok = g.memberCount >= MIN_GROUP_MEMBERS && g.adultCount >= MIN_GROUP_ADULTS;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reopen = async () => {
    setBusy(true);
    setError(null);
    try {
      await admin.freezeGroup(g.id, false);
      invalidateAdmin("paused");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={g.name} size={40} square />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</span>
          <span className="subtle" style={{ fontSize: 12 }}>{g.communityName} · {g.freezeKind === "manual" ? "paused by safeguarding" : "paused by the rules"}</span>
        </div>
        {mine && <button className="btn sm" onClick={() => nav.openGroup(g.id)}>Open chat</button>}
      </div>
      <RuleBox members={g.memberCount} adults={g.adultCount} ok={ok} note={ok ? (g.freezeKind === "manual" ? "Meets the rules. You can reopen it." : "Meets the rules. It reopens by itself.") : g.frozenReason ?? "Needs at least 3 people including 2 adults"} />
      {roles.destinyOneAdmin ? <AddAdults group={g} /> : <p className="subtle" style={{ fontSize: 12 }}>Adding people needs the Destiny One Admin role.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {g.freezeKind === "manual" && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn primary" disabled={!ok || busy} onClick={() => void reopen()}>Reopen group</button>
        </div>
      )}
    </article>
  );
}

export function Paused() {
  const paused = usePausedGroups();
  return (
    <>
      <PageHeader title="Paused groups" sub="Groups pause when they drop below 3 people or 2 adults" />
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div className="page-body">
          {paused.isLoading && <Loading />}
          {paused.error && <p className="error">{errorText(paused.error)}</p>}
          {(paused.data ?? []).map((g) => <PausedCard key={g.id} g={g} />)}
          {!paused.isLoading && !paused.data?.length && <Empty title="No paused groups" sub="Every group meets the rules." />}
        </div>
      </div>
    </>
  );
}
