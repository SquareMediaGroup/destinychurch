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
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useDialog } from "@/components/DialogProvider";
import { fetchAdminArray, fetchAdminJson, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend, formatDate } from "@/lib/destinyOne/adminClient";
import { ADMIN_API, type AdminCommunity, type AdminMember, type AdminSettings } from "@/lib/destinyOne/adminTypes";

interface CsCandidate {
  kind: "contact" | "child";
  id: number;
  displayName: string;
  isAdult: boolean;
  emailMatches: boolean;
}

export default function AccessRequestsPage() {
  const { confirm } = useDialog();
  const [pending, setPending] = useState<AdminMember[]>([]);
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [reviewing, setReviewing] = useState<AdminMember | null>(null);

  const load = useCallback(async () => {
    const [p, c, s] = await Promise.all([
      fetchAdminArray<AdminMember>(`${ADMIN_API}/members?status=pending`),
      fetchAdminArray<AdminCommunity>(`${ADMIN_API}/communities`),
      fetchAdminJson<AdminSettings>(`${ADMIN_API}/settings`),
    ]);
    setPending(p);
    setCommunities(c.filter((x) => !x.archived));
    setSettings(s);
  }, []);
  const { loading, error, setError, reload } = useAdminLoader(load);

  const submitted = pending.filter((m) => m.requestSubmittedAt);

  async function decline(m: AdminMember) {
    const ok = await confirm({
      title: "Decline this request?",
      message: `${m.displayName} won't be able to use Destiny One. You can reinstate them later from App members.`,
      confirmLabel: "Decline",
      tone: "danger",
    });
    if (!ok) return;
    const res = await adminSend("POST", `/members/${m.id}/decline`);
    if (!res.ok) setError(res.error);
    reload();
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title="Access requests"
        subtitle="People who signed in without an invite and asked to join. You decide whether each is an adult or under 18."
        back={{ href: "/admin/destiny-one", label: "Destiny One" }}
      />
      <ErrorNote>{error}</ErrorNote>
      {settings && !settings.allowAccessRequests && (
        <p className="mb-4 rounded-xl bg-warning/15 px-4 py-3 text-sm text-warning">
          Destiny One is invite-only right now, so no new requests can be made. Change this in App settings.
        </p>
      )}

      {loading ? (
        <TableSkeleton columns={3} />
      ) : submitted.length === 0 ? (
        <EmptyState icon="how_to_reg" title="No requests waiting" hint="New requests will appear here, and in your notifications." />
      ) : (
        <ul className="space-y-3">
          {submitted.map((m) => (
            <li key={m.id} className={`${cardClass} flex flex-wrap items-center gap-4 p-5`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-destiny-grey dark:text-white">{m.displayName}</p>
                <p className="text-sm text-destiny-grey/55 dark:text-white/55">
                  {m.email ?? "No email"} · asked {formatDate(m.requestSubmittedAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="grey">
                    {m.declaredAdult === null ? "Age not given" : m.declaredAdult ? "Says they're an adult" : "Says they're under 18"}
                  </Badge>
                </div>
                {m.requestNote && (
                  <p className="mt-2 text-sm text-destiny-grey/70 dark:text-white/70">&ldquo;{m.requestNote}&rdquo;</p>
                )}
              </div>
              <div className="flex gap-2">
                <button className={ghostBtn} onClick={() => decline(m)}>Decline</button>
                <button className={primaryBtn} onClick={() => setReviewing(m)}>Review</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewing && settings && (
        <ApproveModal
          member={reviewing}
          communities={communities}
          churchSuite={settings.churchSuiteConfigured}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function ApproveModal({
  member,
  communities,
  churchSuite,
  onClose,
  onDone,
}: {
  member: AdminMember;
  communities: AdminCommunity[];
  churchSuite: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(member.displayName);
  const [adult, setAdult] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<CsCandidate[] | null>(null);

  async function lookup() {
    setCandidates(null);
    const res = await fetch(`${ADMIN_API}/churchsuite?q=${encodeURIComponent(member.email ?? name)}`);
    const json = await res.json().catch(() => []);
    if (!res.ok) setError(json.error ?? "ChurchSuite lookup failed.");
    else setCandidates(json as CsCandidate[]);
  }

  async function approve() {
    if (adult === null) {
      setError("Choose adult or under 18.");
      return;
    }
    setSaving(true);
    const res = await adminSend("POST", `/members/${member.id}/approve`, {
      adult,
      dateOfBirth: dob || null,
      displayName: name.trim() !== member.displayName ? name.trim() : undefined,
      communityIds: [...chosen],
    });
    setSaving(false);
    if (!res.ok) setError(res.error);
    else onDone();
  }

  return (
    <Modal title={`Approve ${member.displayName}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="d1-name">Full name (shown to everyone in their groups)</label>
          <input id="d1-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <fieldset>
          <legend className={labelClass}>Age — you confirm this, not them</legend>
          <div className="flex gap-2">
            {[
              { v: true, label: "Adult (18+)" },
              { v: false, label: "Under 18" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setAdult(o.v)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  adult === o.v
                    ? "border-destiny-orange bg-destiny-orange/10 text-destiny-orange"
                    : "border-black/10 text-destiny-grey/70 dark:border-white/15 dark:text-white/70"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-destiny-grey/50 dark:text-white/50">
            Only adults you confirm count towards the 2-adult rule in groups.
          </p>
        </fieldset>

        <div>
          <label className={labelClass} htmlFor="d1-dob">
            Date of birth {adult === false ? "(so they become an adult automatically at 18)" : "(optional)"}
          </label>
          <input id="d1-dob" type="date" className={inputClass} value={dob} onChange={(e) => setDob(e.target.value)} />
          <p className="mt-1 text-xs text-destiny-grey/50 dark:text-white/50">Only the date they turn 18 is kept.</p>
        </div>

        {communities.length > 0 && (
          <fieldset>
            <legend className={labelClass}>Add to communities (optional)</legend>
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

        {churchSuite && (
          <div className="rounded-xl bg-black/5 p-3 dark:bg-white/5">
            <button type="button" className="text-sm font-bold text-destiny-blue" onClick={lookup}>
              Check ChurchSuite (optional)
            </button>
            {candidates && candidates.length === 0 && (
              <p className="mt-2 text-sm text-destiny-grey/60 dark:text-white/60">No ChurchSuite record found.</p>
            )}
            {candidates && candidates.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {candidates.map((c) => (
                  <li key={`${c.kind}-${c.id}`}>
                    {c.displayName} — {c.kind === "child" ? "Children module" : c.isAdult ? "Adult" : "Under 18 / no DOB"}
                    {c.emailMatches ? " · email matches" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <button className={ghostBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} disabled={saving} onClick={approve}>
            {saving ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
