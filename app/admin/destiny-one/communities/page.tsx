"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
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
import { fetchAdminArray, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend } from "@/lib/destinyOne/adminClient";
import { ADMIN_API, type AdminCommunity } from "@/lib/destinyOne/adminTypes";

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setCommunities(await fetchAdminArray<AdminCommunity>(`${ADMIN_API}/communities`));
  }, []);
  const { loading, error, reload } = useAdminLoader(load);

  const shown = communities.filter((c) => showArchived || !c.archived);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title="Communities & groups"
        subtitle="Each community has an Announcements channel everyone is in, plus department groups. Groups pause automatically if they drop below 3 people or 2 adults."
        back={{ href: "/admin/destiny-one", label: "Destiny One" }}
        action={
          <button className={primaryBtn} onClick={() => setCreating(true)}>
            <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
            New community
          </button>
        }
      />
      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : communities.length === 0 ? (
        <EmptyState icon="diversity_3" title="No communities yet" hint="Start with one for the whole church, then add department groups inside it." />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {shown.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/destiny-one/communities/${c.id}`} className={`${cardClass} block p-5 transition hover:shadow-md`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-destiny-grey dark:text-white">{c.name}</p>
                    {c.archived ? <Badge tone="grey">Archived</Badge> : c.pausedGroupCount > 0 ? <Badge tone="red">{c.pausedGroupCount} paused</Badge> : null}
                  </div>
                  {c.description && <p className="mt-1 text-sm text-destiny-grey/55 dark:text-white/55">{c.description}</p>}
                  <p className="mt-3 text-sm text-destiny-grey/60 dark:text-white/60">
                    {c.memberCount} {c.memberCount === 1 ? "member" : "members"} · {c.groupCount} {c.groupCount === 1 ? "group" : "groups"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {communities.some((c) => c.archived) && (
            <button className={`${ghostBtn} mt-4`} onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? "Hide archived" : "Show archived"}
            </button>
          )}
        </>
      )}

      {creating && (
        <CreateCommunity
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CreateCommunity({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    const res = await adminSend("POST", "/communities", { name, description: description || null });
    setSaving(false);
    if (!res.ok) setError(res.error);
    else onDone();
  }

  return (
    <Modal title="New community" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="c-name">Name</label>
          <input id="c-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Destiny Church" />
        </div>
        <div>
          <label className={labelClass} htmlFor="c-desc">Description (optional)</label>
          <textarea id="c-desc" rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <p className="text-xs text-destiny-grey/50 dark:text-white/50">
          It comes with an Announcements channel, which opens once at least 3 people, including 2 adults, have joined.
        </p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <button className={ghostBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} disabled={saving || name.trim().length === 0} onClick={create}>Create</button>
        </div>
      </div>
    </Modal>
  );
}
