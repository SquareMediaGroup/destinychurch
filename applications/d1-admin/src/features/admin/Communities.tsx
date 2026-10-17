// Communities and their groups: create, archive, members and group admins.

import { useState } from "react";
import { checkComposition, type AdminCommunity } from "@destiny/shared";
import { Avatar, Empty, Loading, PageHeader, RuleBox } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { invalidateAdmin, useAdminCommunities, useAdminCommunity, useMembers } from "@/lib/adminData";
import { invalidateCommunities } from "@/lib/chat";
import { plural } from "@/lib/format";
import { nav, useNav } from "@/lib/nav";

function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      invalidateAdmin("communities");
      invalidateAdmin("community");
      invalidateCommunities();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function NewGroup({ communityId, people, onDone }: { communityId: string; people: { id: string; displayName: string; isAdult: boolean }[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const { busy, error, run } = useRun();
  const chosen = people.filter((p) => picked.includes(p.id));
  const rule = checkComposition({ members: chosen.length, adults: chosen.filter((p) => p.isAdult).length });

  return (
    <div className="note" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field"><span>Group name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Department</span><input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {people.map((p) => (
          <button key={p.id} className="chip outline" role="checkbox" aria-checked={picked.includes(p.id)} onClick={() => setPicked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}>
            {p.displayName}{p.isAdult ? "" : " (under 18)"}
          </button>
        ))}
      </div>
      <RuleBox members={chosen.length} adults={chosen.filter((p) => p.isAdult).length} ok={rule.ok} />
      {error && <p className="error" role="alert">{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={onDone}>Cancel</button>
        <button className="btn primary" disabled={!rule.ok || name.trim().length < 2 || busy} onClick={() => void run(() => admin.createGroup(communityId, { name: name.trim(), department: department.trim() || undefined, memberIds: picked })).then((ok) => ok && onDone())}>Create group</button>
      </div>
    </div>
  );
}

function AddMembers({ communityId, existing }: { communityId: string; existing: string[] }) {
  const members = useMembers();
  const [q, setQ] = useState("");
  const { busy, error, run } = useRun();
  const options = (members.data ?? [])
    .filter((m) => m.status === "active" && !existing.includes(m.id))
    .filter((m) => q.trim().length >= 2 && m.displayName.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 10);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input className="input" placeholder="Add someone: search by name" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((m) => <button key={m.id} className="chip outline" disabled={busy} onClick={() => void run(() => admin.addCommunityMembers(communityId, [m.id]))}>+ {m.displayName}</button>)}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

function CommunityDetail({ id }: { id: string }) {
  const detail = useAdminCommunity(id);
  const [creating, setCreating] = useState(false);
  const { busy, error, run } = useRun();
  const d = detail.data;
  if (detail.isLoading) return <Loading />;
  if (!d) return <Empty title="Not found" />;

  return (
    <div className="page-body" style={{ gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{d.community.name}</h2>
          {d.community.description && <p className="muted" style={{ marginTop: 4 }}>{d.community.description}</p>}
        </div>
        <button className="btn sm" disabled={busy} onClick={() => void run(() => admin.updateCommunity(id, { archived: !d.community.archived }))}>{d.community.archived ? "Restore" : "Archive"}</button>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h3 className="label-caps" style={{ flex: 1 }}>{plural(d.groups.length, "group")}</h3>
          <button className="btn ghost sm" onClick={() => setCreating(true)} disabled={creating}>New group</button>
        </div>
        {creating && <NewGroup communityId={id} people={d.members} onDone={() => setCreating(false)} />}
        {d.groups.map((g) => (
          <div key={g.id} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={g.name} size={32} square ann={g.kind === "announcements"} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>{g.kind === "announcements" ? "Announcements" : g.name}</span>
              <span className="subtle" style={{ fontSize: 12 }}>{[g.department, plural(g.memberCount, "member"), plural(g.adultCount, "adult")].filter(Boolean).join(" · ")}</span>
            </div>
            {g.state === "frozen" && <span className="pill open">Paused</span>}
            {g.state === "archived" && <span className="pill done">Archived</span>}
            {g.kind === "group" && (
              <button className="btn sm" disabled={busy} onClick={() => void run(() => admin.updateGroup(g.id, { archived: g.state !== "archived" }))}>{g.state === "archived" ? "Restore" : "Archive"}</button>
            )}
          </div>
        ))}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 className="label-caps">{plural(d.members.length, "member")}</h3>
        <AddMembers communityId={id} existing={d.members.map((m) => m.id)} />
        {d.members.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <Avatar name={m.displayName} size={28} />
            <span style={{ flex: 1 }}>{m.displayName}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: m.isAdult ? "var(--subtle)" : "var(--tint)" }}>{m.isAdult ? "Adult" : "Under 18"}</span>
            {m.isAdult && (
              <button className="chip outline" role="checkbox" aria-checked={m.role === "admin"} disabled={busy} onClick={() => void run(() => admin.setCommunityRole(id, m.id, m.role === "admin" ? "member" : "admin"))}>Admin</button>
            )}
            <button className="btn sm danger-text" disabled={busy} onClick={() => void run(() => admin.removeCommunityMember(id, m.id))}>Remove</button>
          </div>
        ))}
      </section>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

function NewCommunity({ onDone }: { onDone: (id?: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { busy, error, run } = useRun();
  return (
    <div className="card" style={{ margin: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <input className="input" placeholder="Community name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      {error && <p className="error" role="alert">{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button className="btn sm" onClick={() => onDone()}>Cancel</button>
        <button
          className="btn sm primary"
          disabled={name.trim().length < 2 || busy}
          onClick={() => {
            let created: string | undefined;
            void run(async () => { created = (await admin.createCommunity({ name: name.trim(), description: description.trim() || undefined })).id; }).then((ok) => ok && onDone(created));
          }}
        >
          Create
        </button>
      </div>
    </div>
  );
}

export function Communities() {
  const { view } = useNav();
  const communities = useAdminCommunities();
  const [creating, setCreating] = useState(false);
  const list = communities.data ?? [];
  const selected = view.kind === "admin" && typeof view.id === "string" ? view.id : list[0]?.id ?? null;
  const row = (c: AdminCommunity) => (
    <button key={c.id} className="row" onClick={() => nav.openAdmin("communities", c.id)} aria-current={selected === c.id ? "true" : undefined} style={{ borderRadius: 10, background: selected === c.id ? "var(--sel)" : "transparent", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "10px 12px" }}>
      <span style={{ fontWeight: 600 }}>{c.name}{c.archived ? " (archived)" : ""}</span>
      <span className="subtle" style={{ fontSize: 12 }}>{plural(c.memberCount, "member")} · {plural(c.groupCount, "group")}{c.pausedGroupCount ? ` · ${c.pausedGroupCount} paused` : ""}</span>
    </button>
  );
  return (
    <>
      <PageHeader title="Communities" sub="Each community has an Announcements channel and its groups">
        <button className="btn primary" onClick={() => setCreating(true)} disabled={creating}>New community</button>
      </PageHeader>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div className="scroll" style={{ width: 300, flex: "none", borderRight: "0.5px solid var(--sep)", padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {creating && <NewCommunity onDone={(id) => { setCreating(false); if (id) nav.openAdmin("communities", id); }} />}
          {communities.isLoading && <Loading />}
          {communities.error && <p className="error">{errorText(communities.error)}</p>}
          {list.map(row)}
        </div>
        <div className="scroll" style={{ flex: 1, minWidth: 0 }}>{selected ? <CommunityDetail id={selected} /> : !communities.isLoading && <Empty title="No communities yet" />}</div>
      </div>
    </>
  );
}
