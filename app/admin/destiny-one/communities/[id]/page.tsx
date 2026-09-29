"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
import { PeoplePicker, RuleCheck } from "@/components/admin/destinyOne/PeoplePicker";
import { fetchAdminArray, fetchAdminJson, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend } from "@/lib/destinyOne/adminClient";
import {
  ADMIN_API,
  type AdminCommunityDetail,
  type AdminGroup,
  type AdminGroupDetail,
  type AdminMember,
} from "@/lib/destinyOne/adminTypes";

function GroupState({ group }: { group: AdminGroup }) {
  if (group.state === "archived") return <Badge tone="grey">Archived</Badge>;
  if (group.state === "frozen") return <Badge tone="red">{group.freezeKind === "manual" ? "Paused by safeguarding" : "Paused"}</Badge>;
  return <Badge tone="green">Active</Badge>;
}

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const { confirm } = useDialog();
  const [detail, setDetail] = useState<AdminCommunityDetail | null>(null);
  const [everyone, setEveryone] = useState<AdminMember[]>([]);
  const [modal, setModal] = useState<"add-people" | "new-group" | "edit" | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, m] = await Promise.all([
      fetchAdminJson<AdminCommunityDetail>(`${ADMIN_API}/communities/${id}`),
      fetchAdminArray<AdminMember>(`${ADMIN_API}/members?status=active`),
    ]);
    setDetail(d);
    setEveryone(m);
  }, [id]);
  const { loading, error, setError, reload } = useAdminLoader(load);

  const groups = detail?.groups.filter((g) => g.kind === "group") ?? [];
  const announcements = detail?.groups.find((g) => g.kind === "announcements");
  const inCommunity = new Set(detail?.members.map((m) => m.id));

  async function setRole(memberId: string, role: "admin" | "member") {
    const res = await adminSend("PATCH", `/communities/${id}/members`, { memberId, role });
    if (!res.ok) setError(res.error);
    reload();
  }

  async function remove(memberId: string, name: string) {
    const ok = await confirm({
      title: `Remove ${name}?`,
      message: "They'll leave this community and every group in it. Groups left without 2 adults will pause.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    const res = await adminSend("DELETE", `/communities/${id}/members`, { memberId });
    if (!res.ok) setError(res.error);
    reload();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title={detail?.community.name ?? "Community"}
        subtitle={detail?.community.description ?? undefined}
        back={{ href: "/admin/destiny-one/communities", label: "Communities & groups" }}
        action={
          detail && (
            <div className="flex gap-2">
              <button className={ghostBtn} onClick={() => setModal("edit")}>Edit</button>
              <button className={primaryBtn} onClick={() => setModal("new-group")}>
                <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
                New group
              </button>
            </div>
          )
        }
      />
      <ErrorNote>{error}</ErrorNote>

      {loading || !detail ? (
        <TableSkeleton columns={3} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <section>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-destiny-grey/50 dark:text-white/50">Groups</h2>
            <ul className="space-y-2">
              {announcements && (
                <li>
                  <button className={`${cardClass} flex w-full items-center gap-3 px-5 py-4 text-left`} onClick={() => setOpenGroup(announcements.id)}>
                    <span className="material-symbols-rounded text-destiny-grey/50" aria-hidden="true">campaign</span>
                    <span className="flex-1">
                      <span className="block font-bold">Announcements</span>
                      <span className="block text-sm text-destiny-grey/55 dark:text-white/55">Everyone in the community. Only community admins post.</span>
                      {announcements.state === "frozen" && <span className="block text-sm text-danger">{announcements.frozenReason}</span>}
                    </span>
                    <GroupState group={announcements} />
                  </button>
                </li>
              )}
              {groups.length === 0 && (
                <li><EmptyState icon="groups" title="No department groups yet" hint="Create one for each team — Worship, Kids, Media and so on." /></li>
              )}
              {groups.map((g) => (
                <li key={g.id}>
                  <button className={`${cardClass} flex w-full items-center gap-3 px-5 py-4 text-left transition hover:shadow-md`} onClick={() => setOpenGroup(g.id)}>
                    <span className="flex-1">
                      <span className="block font-bold">{g.name}</span>
                      <span className="block text-sm text-destiny-grey/55 dark:text-white/55">
                        {g.department ? `${g.department} · ` : ""}
                        {g.memberCount} people, {g.adultCount} adults
                      </span>
                      {g.state === "frozen" && <span className="block text-sm text-danger">{g.frozenReason}</span>}
                    </span>
                    <GroupState group={g} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-destiny-grey/50 dark:text-white/50">
                Members ({detail.members.length})
              </h2>
              <button className="text-sm font-bold text-destiny-blue" onClick={() => setModal("add-people")}>Add people</button>
            </div>
            <ul className={`${cardClass} divide-y divide-black/5 dark:divide-white/10`}>
              {detail.members.length === 0 && <li className="p-4 text-sm text-destiny-grey/55 dark:text-white/55">Nobody yet.</li>}
              {detail.members.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <span className="flex-1 font-medium">{p.displayName}</span>
                  <Badge tone={p.isAdult ? "blue" : "purple"}>{p.isAdult ? "Adult" : "Under 18"}</Badge>
                  <select
                    aria-label={`Role for ${p.displayName}`}
                    className="rounded-lg bg-black/5 px-2 py-1 text-xs dark:bg-white/10"
                    value={p.role}
                    onChange={(e) => setRole(p.id, e.target.value as "admin" | "member")}
                  >
                    <option value="member">Member</option>
                    <option value="admin" disabled={!p.isAdult}>Admin</option>
                  </select>
                  <button aria-label={`Remove ${p.displayName}`} className="text-destiny-grey/40 hover:text-danger" onClick={() => remove(p.id, p.displayName)}>
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {modal === "add-people" && detail && (
        <AddPeopleModal
          title={`Add people to ${detail.community.name}`}
          candidates={everyone.filter((m) => !inCommunity.has(m.id))}
          onClose={() => setModal(null)}
          onSubmit={(memberIds) => adminSend("POST", `/communities/${id}/members`, { memberIds, role: "member" })}
          onDone={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {modal === "new-group" && detail && (
        <NewGroupModal
          communityId={id}
          people={detail.members}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {modal === "edit" && detail && (
        <EditCommunityModal
          detail={detail}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {openGroup && detail && (
        <GroupModal
          groupId={openGroup}
          communityPeople={detail.members}
          onClose={() => setOpenGroup(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

function AddPeopleModal({
  title,
  candidates,
  onClose,
  onSubmit,
  onDone,
}: {
  title: string;
  candidates: { id: string; displayName: string; isAdult: boolean }[];
  onClose: () => void;
  onSubmit: (ids: string[]) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    setSaving(true);
    const res = await onSubmit([...selected]);
    setSaving(false);
    if (!res.ok) setError(res.error);
    else onDone();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <PeoplePicker people={candidates} selected={selected} onChange={setSelected} emptyHint="Everyone is already in. Invite or approve more people first." />
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-4 flex justify-end gap-2">
        <button className={ghostBtn} onClick={onClose}>Cancel</button>
        <button className={primaryBtn} disabled={saving || selected.size === 0} onClick={add}>
          Add {selected.size || ""}
        </button>
      </div>
    </Modal>
  );
}

function NewGroupModal({
  communityId,
  people,
  onClose,
  onDone,
}: {
  communityId: string;
  people: { id: string; displayName: string; isAdult: boolean }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const adultsChosen = people.filter((p) => selected.has(p.id) && p.isAdult);

  async function create() {
    setSaving(true);
    const res = await adminSend("POST", `/communities/${communityId}/groups`, {
      name,
      department: department || null,
      memberIds: [...selected],
      adminIds: [...admins].filter((a) => selected.has(a)),
    });
    setSaving(false);
    if (!res.ok) setError(res.error);
    else onDone();
  }

  return (
    <Modal title="New group" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="g-name">Group name</label>
            <input id="g-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunday Worship Team" />
          </div>
          <div>
            <label className={labelClass} htmlFor="g-dept">Department (optional)</label>
            <input id="g-dept" className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Worship" />
          </div>
        </div>
        <div>
          <p className={labelClass}>People (from this community)</p>
          <PeoplePicker people={people} selected={selected} onChange={setSelected} emptyHint="Add people to the community first." />
          <RuleCheck people={people} selected={selected} />
        </div>
        {adultsChosen.length > 0 && (
          <fieldset>
            <legend className={labelClass}>Group admins (adults only)</legend>
            <div className="flex flex-wrap gap-2">
              {adultsChosen.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-sm dark:bg-white/10">
                  <input
                    type="checkbox"
                    checked={admins.has(p.id)}
                    onChange={() => {
                      const next = new Set(admins);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      setAdmins(next);
                    }}
                  />
                  {p.displayName}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <button className={ghostBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} disabled={saving || !name.trim()} onClick={create}>Create group</button>
        </div>
      </div>
    </Modal>
  );
}

function EditCommunityModal({ detail, onClose, onDone }: { detail: AdminCommunityDetail; onClose: () => void; onDone: () => void }) {
  const { confirm } = useDialog();
  const [name, setName] = useState(detail.community.name);
  const [description, setDescription] = useState(detail.community.description ?? "");
  const [error, setError] = useState("");

  async function save(extra: Record<string, unknown> = {}) {
    const res = await adminSend("PATCH", `/communities/${detail.community.id}`, { name, description: description || null, ...extra });
    if (!res.ok) setError(res.error);
    else onDone();
  }

  async function toggleArchive() {
    const archiving = !detail.community.archived;
    if (archiving) {
      const ok = await confirm({
        title: "Archive this community?",
        message: "It will disappear from members' apps. History is kept for safeguarding until the retention period ends.",
        confirmLabel: "Archive",
        tone: "danger",
      });
      if (!ok) return;
    }
    await save({ archived: archiving });
  }

  return (
    <Modal title="Edit community" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="ec-name">Name</label>
          <input id="ec-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="ec-desc">Description</label>
          <textarea id="ec-desc" rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-between gap-2">
          <button className={detail.community.archived ? ghostBtn : dangerBtn} onClick={toggleArchive}>
            {detail.community.archived ? "Restore" : "Archive"}
          </button>
          <div className="flex gap-2">
            <button className={ghostBtn} onClick={onClose}>Cancel</button>
            <button className={primaryBtn} onClick={() => save()}>Save</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GroupModal({
  groupId,
  communityPeople,
  onClose,
  onChanged,
}: {
  groupId: string;
  communityPeople: { id: string; displayName: string; isAdult: boolean }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { confirm } = useDialog();
  const [detail, setDetail] = useState<AdminGroupDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const d = await fetchAdminJson<AdminGroupDetail>(`${ADMIN_API}/groups/${groupId}`);
    setDetail(d);
    setName(d.group.name);
    setDepartment(d.group.department ?? "");
  }, [groupId]);

  const { error: loadError } = useAdminLoader(refresh);

  const inGroup = useMemo(() => new Set(detail?.members.map((m) => m.id)), [detail]);

  async function run(method: "POST" | "PATCH" | "DELETE", path: string, body: unknown) {
    setError("");
    const res = await adminSend(method, path, body);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    await refresh();
    onChanged();
    return true;
  }

  async function remove(memberId: string, personName: string) {
    const ok = await confirm({
      title: `Remove ${personName}?`,
      message: "If this leaves fewer than 3 people or 2 adults, the group pauses until someone is added.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (ok) await run("DELETE", `/groups/${groupId}/members`, { memberId });
  }

  const g = detail?.group;
  const isAnnouncements = g?.kind === "announcements";

  return (
    <Modal title={g?.name ?? "Group"} onClose={onClose} size="lg">
      {!g || !detail ? (
        <p className="text-sm text-destiny-grey/60 dark:text-white/60">{loadError || error || "Loading..."}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <GroupState group={g} />
            <span className="text-destiny-grey/60 dark:text-white/60">{g.memberCount} people, {g.adultCount} adults</span>
          </div>
          {g.state === "frozen" && (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {g.frozenReason}
              {g.freezeKind === "auto" ? " Add people to reopen it." : " Only Safeguarding can lift this."}
            </p>
          )}
          <p className="text-xs text-destiny-grey/50 dark:text-white/50">Message content is not shown here. Safeguarding can review conversations, with a reason, from the Safeguarding page.</p>

          {!isAnnouncements && (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className={labelClass} htmlFor="gm-name">Name</label>
                <input id="gm-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="gm-dept">Department</label>
                <input id="gm-dept" className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <button className={ghostBtn} onClick={() => run("PATCH", `/groups/${groupId}`, { name, department: department || null })}>Save</button>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className={labelClass}>Members</p>
              {!isAnnouncements && g.state !== "archived" && (
                <button className="text-sm font-bold text-destiny-blue" onClick={() => setAdding(!adding)}>
                  {adding ? "Done adding" : "Add people"}
                </button>
              )}
            </div>
            {isAnnouncements && (
              <p className="mb-2 text-xs text-destiny-grey/50 dark:text-white/50">Everyone in the community is here. Community admins can post.</p>
            )}
            {adding && (
              <AddToGroup
                candidates={communityPeople.filter((p) => !inGroup.has(p.id))}
                onAdd={(ids) => run("POST", `/groups/${groupId}/members`, { memberIds: ids, role: "member" })}
              />
            )}
            <ul className="divide-y divide-black/5 rounded-xl border border-black/5 dark:divide-white/10 dark:border-white/10">
              {detail.members.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex-1 font-medium">{p.displayName}</span>
                  <Badge tone={p.isAdult ? "blue" : "purple"}>{p.isAdult ? "Adult" : "Under 18"}</Badge>
                  {!isAnnouncements && (
                    <>
                      <select
                        aria-label={`Role for ${p.displayName}`}
                        className="rounded-lg bg-black/5 px-2 py-1 text-xs dark:bg-white/10"
                        value={p.role}
                        onChange={(e) => run("PATCH", `/groups/${groupId}/members`, { memberId: p.id, role: e.target.value })}
                      >
                        <option value="member">Member</option>
                        <option value="admin" disabled={!p.isAdult}>Admin</option>
                      </select>
                      <button aria-label={`Remove ${p.displayName}`} className="text-destiny-grey/40 hover:text-danger" onClick={() => remove(p.id, p.displayName)}>
                        <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
                      </button>
                    </>
                  )}
                  {isAnnouncements && p.role === "admin" && <Badge tone="grey">Can post</Badge>}
                </li>
              ))}
            </ul>
          </div>

          <ErrorNote>{error}</ErrorNote>
          {!isAnnouncements && (
            <div className="flex justify-end">
              <button
                className={g.state === "archived" ? ghostBtn : dangerBtn}
                onClick={async () => {
                  const archiving = g.state !== "archived";
                  if (archiving) {
                    const ok = await confirm({
                      title: "Archive this group?",
                      message: "It disappears from members' apps and nobody can post. History is kept for safeguarding until the retention period ends.",
                      confirmLabel: "Archive",
                      tone: "danger",
                    });
                    if (!ok) return;
                  }
                  await run("PATCH", `/groups/${groupId}`, { archived: archiving });
                }}
              >
                {g.state === "archived" ? "Restore group" : "Archive group"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function AddToGroup({
  candidates,
  onAdd,
}: {
  candidates: { id: string; displayName: string; isAdult: boolean }[];
  onAdd: (ids: string[]) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return (
    <div className="mb-3 rounded-xl bg-black/[0.03] p-3 dark:bg-white/5">
      <PeoplePicker people={candidates} selected={selected} onChange={setSelected} emptyHint="Everyone in the community is already in this group." />
      <div className="mt-2 flex justify-end">
        <button
          className={primaryBtn}
          disabled={selected.size === 0}
          onClick={async () => {
            if (await onAdd([...selected])) setSelected(new Set());
          }}
        >
          Add {selected.size || ""}
        </button>
      </div>
    </div>
  );
}
