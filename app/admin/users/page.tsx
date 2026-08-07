"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_ROLES, type AdminRole } from "@/lib/adminRoles";

const ROLE_LABELS: Record<AdminRole, string> = {
  training_admin: "Training Admin",
  event_admin: "Event Admin",
  store_admin: "Store Admin",
  site_admin: "Site Admin",
  super_admin: "Super Admin",
};

const ROLE_HINTS: Record<AdminRole, string> = {
  training_admin: "Training section only.",
  event_admin: "Courses + announcements (not the sitewide banner).",
  store_admin: "Store: products, orders, hero.",
  site_admin: "Posts and redirects.",
  super_admin: "Full access, including the sitewide banner, cache and users.",
};

type AdminUser = {
  auth_user_id: string;
  email: string;
} & Record<AdminRole, boolean>;

const emptyRoles = () =>
  Object.fromEntries(ADMIN_ROLES.map((r) => [r, false])) as Record<AdminRole, boolean>;

export default function AdminUsersPage() {
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

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Remove access for ${u.email}? This deletes their login.`)) return;
    const res = await fetch(`/api/admin/users/${u.auth_user_id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-destiny-grey">Users</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Manage admin logins and which sections each person can access.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-lg">add</span>
          Add user
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-6 py-10 text-center text-sm text-destiny-grey/50">
          No admin users yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              <tr>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Roles</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((u) => (
                <tr key={u.auth_user_id} className="transition hover:bg-[#f5f7fa]">
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
                        aria-label="Edit"
                      >
                        <span className="material-symbols-rounded text-xl">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-destiny-grey/40 transition hover:text-red-500"
                        aria-label="Remove"
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

      {editing && (
        <UserModal
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setError("");
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
        const d = await res.json();
        onError(d.error ?? "Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-black text-destiny-grey">
          {user ? "Edit access" : "Add user"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!user && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Temporary password
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                />
              </div>
            </>
          )}

          <div>
            <p className="mb-2 text-xs font-bold text-destiny-grey/60">Access</p>
            <div className="flex flex-col gap-2">
              {ADMIN_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/8 p-3 hover:border-black/15"
                >
                  <input
                    type="checkbox"
                    checked={roles[role]}
                    onChange={(e) =>
                      setRoles((r) => ({ ...r, [role]: e.target.checked }))
                    }
                    className="mt-0.5 accent-destiny-orange"
                  />
                  <div>
                    <p className="text-sm font-bold text-destiny-grey">{ROLE_LABELS[role]}</p>
                    <p className="text-xs text-destiny-grey/50">{ROLE_HINTS[role]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-destiny-grey/60 hover:text-destiny-grey"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
