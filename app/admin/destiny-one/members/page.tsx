"use client";

import { useCallback, useState } from "react";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  FilterChips,
  ListToolbar,
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
import { useAdminList } from "@/lib/useAdminList";
import { fetchAdminArray, fetchAdminJson, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend, formatDate } from "@/lib/destinyOne/adminClient";
import { ADMIN_API, LEADER_ROLE_LABELS, type AdminMember, type LeaderRole } from "@/lib/destinyOne/adminTypes";

const STATUS_TONE: Record<AdminMember["status"], string> = { active: "green", pending: "orange", suspended: "red" };
const SOURCE_LABEL: Record<NonNullable<AdminMember["verificationSource"]>, string> = {
  invite: "Invite",
  admin: "Approved by staff",
  churchsuite: "ChurchSuite sign-in",
};

export default function MembersPage() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [open, setOpen] = useState<AdminMember | null>(null);

  const load = useCallback(async () => {
    setMembers(await fetchAdminArray<AdminMember>(`${ADMIN_API}/members`));
  }, []);
  const { loading, error, reload } = useAdminLoader(load);

  const list = useAdminList<AdminMember>({
    items: members,
    searchKeys: [
      { name: "displayName", weight: 0.7 },
      { name: "email", weight: 0.3 },
    ],
    filters: [
      {
        key: "status",
        options: (["active", "pending", "suspended"] as const).map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
        match: (m, v) => m.status === v,
        initial: "active",
      },
      {
        key: "age",
        options: [
          { value: "adult", label: "Adults" },
          { value: "minor", label: "Under 18" },
        ],
        match: (m, v) => (v === "adult" ? m.isAdult : !m.isAdult),
      },
      {
        key: "role",
        options: (Object.keys(LEADER_ROLE_LABELS) as LeaderRole[]).map((r) => ({ value: r, label: LEADER_ROLE_LABELS[r] })),
        match: (m, v) => m.roles.includes(v as LeaderRole),
      },
    ],
    sorts: { name: (a, b) => a.displayName.localeCompare(b.displayName) },
    defaultSort: { field: "name", direction: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="App members"
        subtitle="Everyone with a Destiny One account. Staff set names and ages here; ChurchSuite isn't needed."
        back={{ href: "/admin/destiny-one", label: "Destiny One" }}
      />
      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : members.length === 0 ? (
        <EmptyState icon="group" title="No members yet" hint="Invite people, or approve access requests." />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name or email"
            noun="member"
            total={list.total}
            shown={list.shown}
            filters={
              <>
                <FilterChips label="Status" options={list.filterOptions("status")} value={list.filterValues.status} onChange={(v) => list.setFilter("status", v)} />
                <FilterChips label="Age" options={list.filterOptions("age")} value={list.filterValues.age} onChange={(v) => list.setFilter("age", v)} />
                <FilterChips label="Role" options={list.filterOptions("role")} value={list.filterValues.role} onChange={(v) => list.setFilter("role", v)} />
              </>
            }
          />
          <ul className="space-y-2">
            {list.visible.map((m) => (
              <li key={m.id}>
                <button
                  className={`${cardClass} flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition hover:shadow-md`}
                  onClick={() => setOpen(m)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-destiny-grey dark:text-white">{m.displayName}</span>
                    <span className="block text-sm text-destiny-grey/55 dark:text-white/55">
                      {m.email ?? "No email"} · {m.groupCount} {m.groupCount === 1 ? "group" : "groups"}
                    </span>
                  </span>
                  <Badge tone={m.isAdult ? "blue" : "purple"}>{m.isAdult ? "Adult" : "Under 18"}</Badge>
                  {m.roles.map((r) => (
                    <Badge key={r} tone="grey">{LEADER_ROLE_LABELS[r]}</Badge>
                  ))}
                  <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && (
        <MemberPanel
          memberId={open.id}
          onClose={() => setOpen(null)}
          onChanged={() => reload()}
        />
      )}
    </div>
  );
}

interface Detail {
  member: AdminMember;
  communities: { id: string; name: string; role: "admin" | "member" }[];
  groups: { id: string; name: string; state: string; communityId: string; role: "admin" | "member" }[];
}

function MemberPanel({ memberId, onClose, onChanged }: { memberId: string; onClose: () => void; onChanged: () => void }) {
  const { confirm } = useDialog();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<Set<LeaderRole>>(new Set());
  const [ageAdult, setAgeAdult] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const d = await fetchAdminJson<Detail>(`${ADMIN_API}/members/${memberId}`);
    setDetail(d);
    setName(d.member.displayName);
    setRoles(new Set(d.member.roles));
  }, [memberId]);

  const { error: loadError } = useAdminLoader(refresh);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    const res = await adminSend("PATCH", `/members/${memberId}`, body);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    await refresh();
    onChanged();
    return true;
  }

  async function save() {
    const body: Record<string, unknown> = {};
    if (!detail) return;
    if (name.trim() !== detail.member.displayName) body.displayName = name.trim();
    const sameRoles = roles.size === detail.member.roles.length && detail.member.roles.every((r) => roles.has(r));
    if (!sameRoles) body.roles = [...roles];
    if (ageAdult !== null) body.age = { adult: ageAdult, dateOfBirth: dob || null };
    if (Object.keys(body).length === 0) return setError("Nothing to change.");
    if (await patch(body)) {
      setAgeAdult(null);
      setDob("");
    }
  }

  async function setStatus(status: "active" | "suspended") {
    if (status === "suspended") {
      const ok = await confirm({
        title: "Suspend this account?",
        message: "They'll be taken out of every group straight away. Any group left without 2 adults will pause until that's fixed.",
        confirmLabel: "Suspend",
        tone: "danger",
      });
      if (!ok) return;
    }
    await patch({ status });
  }

  async function erase() {
    const ok = await confirm({
      title: "Delete this account?",
      message:
        "This removes them from every group, anonymises them as 'Former member' and deletes their sign-in. Their messages are kept for the safeguarding retention period. This cannot be undone.",
      confirmLabel: "Delete account",
      tone: "danger",
    });
    if (!ok) return;
    const res = await adminSend("DELETE", `/members/${memberId}`);
    if (!res.ok) return setError(res.error);
    onChanged();
    onClose();
  }

  const m = detail?.member;
  return (
    <Modal title={m?.displayName ?? "Member"} onClose={onClose} size="lg">
      {!m ? (
        <p className="text-sm text-destiny-grey/60 dark:text-white/60">{loadError || error || "Loading..."}</p>
      ) : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-destiny-grey/50 dark:text-white/50">Email</dt><dd>{m.email ?? "—"}</dd></div>
            <div><dt className="text-destiny-grey/50 dark:text-white/50">Status</dt><dd><Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge></dd></div>
            <div><dt className="text-destiny-grey/50 dark:text-white/50">Age</dt><dd>{m.isAdult ? "Adult" : m.adultOn ? `Under 18 (adult from ${formatDate(m.adultOn)})` : "Under 18"}</dd></div>
            <div><dt className="text-destiny-grey/50 dark:text-white/50">Verified</dt><dd>{m.verificationSource ? `${SOURCE_LABEL[m.verificationSource]}, ${formatDate(m.verifiedAt)}` : "Not yet"}</dd></div>
          </dl>

          <div>
            <label className={labelClass} htmlFor="m-name">Full name</label>
            <input id="m-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <fieldset>
            <legend className={labelClass}>Correct their age</legend>
            <div className="flex gap-2">
              {[
                { v: true, label: "Adult (18+)" },
                { v: false, label: "Under 18" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setAgeAdult(ageAdult === o.v ? null : o.v)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${
                    ageAdult === o.v ? "border-destiny-orange bg-destiny-orange/10 text-destiny-orange" : "border-black/10 text-destiny-grey/70 dark:border-white/15 dark:text-white/70"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {ageAdult !== null && (
              <input type="date" aria-label="Date of birth" className={`${inputClass} mt-2`} value={dob} onChange={(e) => setDob(e.target.value)} />
            )}
            <p className="mt-1 text-xs text-destiny-grey/50 dark:text-white/50">Changing someone to under 18 can pause groups that relied on them as an adult.</p>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Leader roles (adults only)</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LEADER_ROLE_LABELS) as LeaderRole[]).map((r) => (
                <label key={r} className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-sm dark:bg-white/10">
                  <input
                    type="checkbox"
                    checked={roles.has(r)}
                    disabled={!m.isAdult}
                    onChange={() => {
                      const next = new Set(roles);
                      if (next.has(r)) next.delete(r);
                      else next.add(r);
                      setRoles(next);
                    }}
                  />
                  {LEADER_ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </fieldset>

          {(detail.communities.length > 0 || detail.groups.length > 0) && (
            <div className="text-sm">
              <p className={labelClass}>In</p>
              <ul className="space-y-1">
                {detail.communities.map((c) => (
                  <li key={c.id}>
                    <a className="font-medium text-destiny-blue" href={`/admin/destiny-one/communities/${c.id}`}>{c.name}</a>
                    {c.role === "admin" ? " (community admin)" : ""}
                    {detail.groups.filter((g) => g.communityId === c.id).length > 0 && (
                      <span className="text-destiny-grey/60 dark:text-white/60">
                        {" — "}
                        {detail.groups.filter((g) => g.communityId === c.id).map((g) => `${g.name}${g.role === "admin" ? " (admin)" : ""}`).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ErrorNote>{error}</ErrorNote>
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              {m.status === "active" ? (
                <button className={ghostBtn} disabled={saving} onClick={() => setStatus("suspended")}>Suspend</button>
              ) : m.status === "suspended" ? (
                <button className={ghostBtn} disabled={saving} onClick={() => setStatus("active")}>Reinstate</button>
              ) : null}
              <button className={dangerBtn} disabled={saving} onClick={erase}>Delete account</button>
            </div>
            <button className={primaryBtn} disabled={saving} onClick={save}>{saving ? "Saving..." : "Save changes"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
