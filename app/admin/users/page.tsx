"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ADMIN_ROLES, ROLE_LABELS, type AdminRole } from "@/lib/adminRoles";
import {
  PageHeader,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  TableSkeleton,
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";
import { useDialog } from "@/components/DialogProvider";
import { clearAdminSessionCache } from "@/lib/useAdminSession";

const ROLE_HINTS: Record<AdminRole, string> = {
  training_admin: "Training section only.",
  event_admin: "Courses + announcements (not the sitewide banner).",
  store_admin: "Store: products, orders, hero.",
  site_admin: "Posts and redirects.",
  host: "Moderates the live chat, and can sign in on /live itself.",
  hr_admin: "Staff directory, leave, jobs, applications, documents and reviews.",
  super_admin: "Full access, including the sitewide banner, cache and users.",
};

type AdminUser = {
  auth_user_id: string;
  email: string;
} & Record<AdminRole, boolean>;

const emptyRoles = () =>
  Object.fromEntries(ADMIN_ROLES.map((r) => [r, false])) as Record<AdminRole, boolean>;

export default function AdminUsersPage() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setEditing("new");
  }, [searchParams]);

  const list = useAdminList<AdminUser>({
    items: users,
    searchKeys: ["email"],
    filters: [
      {
        key: "role",
        options: ADMIN_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
        match: (user, value) => Boolean(user[value as AdminRole]),
      },
    ],
    sorts: { email: (a, b) => a.email.localeCompare(b.email) },
    defaultSort: { field: "email", direction: "asc" },
  });

  async function handleDelete(u: AdminUser) {
    // Was a native window.confirm — the only one left in the admin, and it
    // looked nothing like the rest of the app's dialogs.
    if (
      !(await confirm({
        title: "Remove access",
        message: `Remove access for ${u.email}? This deletes their login and cannot be undone.`,
        confirmLabel: "Remove access",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`/api/admin/users/${u.auth_user_id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Users"
        subtitle="Admin logins and which sections each person can reach."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            Add user
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="group"
          title="No admin users yet"
          hint="Add a login and pick which sections that person can reach."
          action={
            <button className={primaryBtn} onClick={() => setEditing("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              Add user
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by email"
            noun="user"
            total={list.total}
            shown={list.shown}
            filters={
              <FilterChips
                label="Role"
                options={list.filterOptions("role")}
                value={list.filterValues.role}
                onChange={(v) => list.setFilter("role", v)}
              />
            }
          />

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No users match"
              hint="Try a different email, or clear the filters."
              action={
                <button
                  className="text-sm font-bold text-destiny-orange hover:brightness-110"
                  onClick={list.clearAll}
                >
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
                  <tr>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Access</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {list.visible.map((u) => (
                    <tr key={u.auth_user_id} className="transition hover:bg-[#f5f7fa] dark:hover:bg-white/10">
                      <td className="px-5 py-3.5 font-bold text-destiny-grey">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {ADMIN_ROLES.filter((r) => u[r]).length === 0 ? (
                            <span className="text-destiny-grey/30">No access</span>
                          ) : (
                            ADMIN_ROLES.filter((r) => u[r]).map((r) => (
                              <span
                                key={r}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                  r === "super_admin"
                                    ? "bg-destiny-orange/10 text-destiny-orange"
                                    : "bg-black/5 text-destiny-grey/70"
                                }`}
                              >
                                {ROLE_LABELS[r]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setEditing(u)}
                            className="text-destiny-grey/40 transition hover:text-destiny-orange"
                            aria-label={`Edit access for ${u.email}`}
                          >
                            <span className="material-symbols-rounded text-xl">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-destiny-grey/40 transition hover:text-destiny-red"
                            aria-label={`Remove ${u.email}`}
                          >
                            <span className="material-symbols-rounded text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && (
        <UserModal
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setError("");
            // Roles may have changed for the signed-in user — drop the cached
            // session so the sidebar and palette re-read them.
            clearAdminSessionCache();
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function UserModal({
  user,
  onClose,
  onSaved,
  onError,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<Record<AdminRole, boolean>>(
    user
      ? (Object.fromEntries(ADMIN_ROLES.map((r) => [r, Boolean(user[r])])) as Record<
          AdminRole,
          boolean
        >)
      : emptyRoles(),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = user
        ? await fetch(`/api/admin/users/${user.auth_user_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(roles),
          })
        : await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, ...roles }),
          });

      if (res.ok) {
        onSaved();
      } else {
        const d = await res.json().catch(() => ({}));
        onError(d.error ?? "Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  const noAccess = ADMIN_ROLES.every((role) => !roles[role]);

  return (
    <Modal title={user ? `Edit access — ${user.email}` : "Add user"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!user && (
          <>
            <div>
              <label className={labelClass} htmlFor="user-email">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="user-password">
                Temporary password
              </label>
              <input
                id="user-password"
                type="text"
                required
                minLength={8}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-destiny-grey/45">
                At least 8 characters. They can change it from the sign-in page.
              </p>
            </div>
          </>
        )}

        <div>
          <p className={labelClass}>Access</p>
          <div className="flex flex-col gap-2">
            {ADMIN_ROLES.map((role) => (
              <label
                key={role}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  roles[role]
                    ? "border-destiny-orange/40 bg-destiny-orange/5"
                    : "border-black/8 hover:border-black/15"
                }`}
              >
                <input
                  type="checkbox"
                  checked={roles[role]}
                  onChange={(e) => setRoles((r) => ({ ...r, [role]: e.target.checked }))}
                  className="mt-0.5 accent-destiny-orange"
                />
                <div>
                  <p className="text-sm font-bold text-destiny-grey">{ROLE_LABELS[role]}</p>
                  <p className="text-xs text-destiny-grey/50">{ROLE_HINTS[role]}</p>
                </div>
              </label>
            ))}
          </div>
          {noAccess && (
            <p className="mt-2 text-xs font-bold text-destiny-orange">
              With nothing ticked they can sign in but only see the dashboard.
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
