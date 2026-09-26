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
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";
import { fetchAdminArray, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend, formatDate } from "@/lib/destinyOne/adminClient";
import {
  ADMIN_API,
  LEADER_ROLE_LABELS,
  type AdminCommunity,
  type AdminInvite,
  type LeaderRole,
} from "@/lib/destinyOne/adminTypes";

const STATUS_TONE: Record<AdminInvite["status"], string> = {
  pending: "orange",
  accepted: "green",
  revoked: "grey",
  expired: "grey",
};

export default function InvitesPage() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [i, c] = await Promise.all([
      fetchAdminArray<AdminInvite>(`${ADMIN_API}/invites`),
      fetchAdminArray<AdminCommunity>(`${ADMIN_API}/communities`),
    ]);
    setInvites(i);
    setCommunities(c.filter((x) => !x.archived));
  }, []);
  const { loading, error, setError, reload } = useAdminLoader(load);

  const list = useAdminList<AdminInvite>({
    items: invites,
    searchKeys: [
      { name: "displayName", weight: 0.6 },
      { name: "email", weight: 0.4 },
    ],
    filters: [
      {
        key: "status",
        options: (["pending", "accepted", "expired", "revoked"] as const).map((s) => ({
          value: s,
          label: s[0].toUpperCase() + s.slice(1),
        })),
        match: (i, v) => i.status === v,
        initial: "pending",
      },
    ],
    sorts: { created: (a, b) => b.createdAt.localeCompare(a.createdAt) },
    defaultSort: { field: "created", direction: "asc" },
  });

  async function act(invite: AdminInvite, action: "resend" | "revoke") {
    const res = await adminSend("PATCH", `/invites/${invite.id}`, { action });
    if (!res.ok) setError(res.error);
    else setNotice(action === "resend" ? `Invite sent again to ${invite.email}.` : `Invite for ${invite.email} revoked.`);
    reload();
  }

  const communityName = (id: string) => communities.find((c) => c.id === id)?.name ?? "Archived community";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Invites"
        subtitle="Invite people by email. When they sign in with that address they're in straight away, with the details you set here."
        back={{ href: "/admin/destiny-one", label: "Destiny One" }}
        action={
          <button className={primaryBtn} onClick={() => setCreating(true)}>
            <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
            Invite people
          </button>
        }
      />
      <ErrorNote>{error}</ErrorNote>
      {notice && <p className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{notice}</p>}

      {loading ? (
        <TableSkeleton columns={4} />
      ) : invites.length === 0 ? (
        <EmptyState icon="outgoing_mail" title="No invites yet" hint="Invite your first people to Destiny One." />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name or email"
            noun="invite"
            total={list.total}
            shown={list.shown}
            filters={
              <FilterChips
                label="Status"
                options={list.filterOptions("status")}
                value={list.filterValues.status}
                onChange={(v) => list.setFilter("status", v)}
              />
            }
          />
          <ul className="space-y-2">
            {list.visible.map((i) => (
              <li key={i.id} className={`${cardClass} flex flex-wrap items-center gap-3 px-5 py-4`}>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-destiny-grey dark:text-white">{i.displayName}</p>
                  <p className="text-sm text-destiny-grey/55 dark:text-white/55">
                    {i.email} · {i.isAdult ? "Adult" : "Under 18"}
                    {i.roles.length ? ` · ${i.roles.map((r) => LEADER_ROLE_LABELS[r]).join(", ")}` : ""}
                    {i.communityIds.length ? ` · ${i.communityIds.map(communityName).join(", ")}` : ""}
                  </p>
                  <p className="text-xs text-destiny-grey/45 dark:text-white/45">
                    {i.status === "accepted"
                      ? `Accepted ${formatDate(i.acceptedAt)}`
                      : `Sent ${formatDate(i.lastSentAt ?? i.createdAt)} · expires ${formatDate(i.expiresAt)}`}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge>
                {(i.status === "pending" || i.status === "expired") && (
                  <div className="flex gap-2">
                    <button className={ghostBtn} onClick={() => act(i, "resend")}>Resend</button>
                    {i.status === "pending" && (
                      <button className={ghostBtn} onClick={() => act(i, "revoke")}>Revoke</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {creating && (
        <InviteModal
          communities={communities}
          onClose={() => setCreating(false)}
          onDone={(message) => {
            setCreating(false);
            setNotice(message);
            reload();
          }}
        />
      )}
    </div>
  );
}

function parseEmails(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
}

function InviteModal({
  communities,
  onClose,
  onDone,
}: {
  communities: AdminCommunity[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [mode, setMode] = useState<"one" | "many">("one");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");
  const [adult, setAdult] = useState(true);
  const [dob, setDob] = useState("");
  const [roles, setRoles] = useState<Set<LeaderRole>>(new Set());
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function send() {
    setError("");
    // Bulk lines are "Name <email>" or "Name, email" or just an email (name = the part before @).
    const people =
      mode === "one"
        ? [{ email: email.trim(), name: name.trim() }]
        : bulk
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const found = parseEmails(line)[0] ?? "";
              const rest = line.replace(/<?[^\s,;<>]+@[^\s,;<>]+>?/, "").replace(/[,;]/g, " ").trim();
              return { email: found, name: rest || found.split("@")[0] };
            });
    if (people.some((p) => !p.email)) return setError("Every line needs an email address.");
    if (mode === "one" && name.trim().length < 2) return setError("Enter their full name.");

    setSaving(true);
    const res = await adminSend<{ created: number; failed: { email: string; error: string }[] }>("POST", "/invites", {
      invites: people.map((p) => ({
        email: p.email,
        name: p.name,
        adult,
        dateOfBirth: dob || null,
        roles: adult ? [...roles] : [],
        communityIds: [...chosen],
      })),
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    const { created, failed } = res.data;
    if (failed.length) {
      setError(failed.map((f) => `${f.email}: ${f.error}`).join("\n"));
      if (!created) return;
    }
    onDone(`${created} ${created === 1 ? "invite" : "invites"} sent.`);
  }

  return (
    <Modal title="Invite people" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["one", "many"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${mode === m ? "bg-destiny-grey text-white dark:bg-white dark:text-destiny-grey" : "bg-black/5 dark:bg-white/10"}`}
            >
              {m === "one" ? "One person" : "Several people"}
            </button>
          ))}
        </div>

        {mode === "one" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="inv-name">Full name</label>
              <input id="inv-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-email">Email</label>
              <input id="inv-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="inv-bulk">One person per line: Name, email</label>
            <textarea
              id="inv-bulk"
              rows={6}
              className={inputClass}
              placeholder={"Jane Smith, jane@example.org\nSam Jones, sam@example.org"}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
            <p className="mt-1 text-xs text-destiny-grey/50 dark:text-white/50">
              Everyone on the list gets the same age, roles and communities below. Up to 100 at once.
            </p>
          </div>
        )}

        <fieldset>
          <legend className={labelClass}>Age</legend>
          <div className="flex gap-2">
            {[
              { v: true, label: "Adult (18+)" },
              { v: false, label: "Under 18" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setAdult(o.v)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${
                  adult === o.v
                    ? "border-destiny-orange bg-destiny-orange/10 text-destiny-orange"
                    : "border-black/10 text-destiny-grey/70 dark:border-white/15 dark:text-white/70"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === "one" && (
          <div>
            <label className={labelClass} htmlFor="inv-dob">
              Date of birth {adult ? "(optional)" : "(recommended, so they become an adult automatically at 18)"}
            </label>
            <input id="inv-dob" type="date" className={inputClass} value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
        )}

        {adult && (
          <fieldset>
            <legend className={labelClass}>Leader role (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LEADER_ROLE_LABELS) as LeaderRole[]).map((r) => (
                <label key={r} className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-sm dark:bg-white/10">
                  <input
                    type="checkbox"
                    checked={roles.has(r)}
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
        )}

        {communities.length > 0 && (
          <fieldset>
            <legend className={labelClass}>Communities to join</legend>
            <div className="flex flex-wrap gap-2">
              {communities.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-sm dark:bg-white/10">
                  <input
                    type="checkbox"
                    checked={chosen.has(c.id)}
                    onChange={() => {
                      const next = new Set(chosen);
                      if (next.has(c.id)) next.delete(c.id);
                      else next.add(c.id);
                      setChosen(next);
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p className="whitespace-pre-line rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={ghostBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} disabled={saving} onClick={send}>
            {saving ? "Sending..." : "Send invite"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
