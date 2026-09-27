"use client";

// Self-service name + profile picture for admin accounts. The equivalent of
// /portal/profile's Account section, but for admin_roles instead of hr_staff
// — admin email/password changes go through Supabase invites, not here.

import { useEffect, useRef, useState } from "react";
import { useAdminSession, clearAdminSessionCache } from "@/lib/useAdminSession";
import { PageHeader, PageLoading } from "@/components/admin/AdminUI";
import { useToast } from "@/components/ToastProvider";

const FIELD =
  "w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20 dark:bg-destiny-grey-800 dark:text-white";
const LABEL = "mb-1.5 block text-sm font-bold text-destiny-grey dark:text-white";

function initials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export default function AdminProfilePage() {
  const session = useAdminSession();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState<"upload" | "remove" | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!session.loaded || synced) return;
    setName(session.name ?? "");
    setAvatarUrl(session.avatarUrl);
    setSynced(true);
  }, [session.loaded, session.name, session.avatarUrl, synced]);

  if (!session.loaded || !synced) return <PageLoading label="Loading your profile" />;

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameBusy(true);
    try {
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't update your name", tone: "error" });
        return;
      }
      clearAdminSessionCache();
      toast.push({ message: "Name updated", tone: "success" });
    } finally {
      setNameBusy(false);
    }
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarBusy("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/me/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't upload that image", tone: "error" });
        return;
      }
      setAvatarUrl(data.avatar_url);
      clearAdminSessionCache();
      toast.push({ message: "Profile picture updated", tone: "success" });
    } finally {
      setAvatarBusy(null);
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy("remove");
    try {
      const res = await fetch("/api/admin/me/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't remove that image", tone: "error" });
        return;
      }
      setAvatarUrl(null);
      clearAdminSessionCache();
    } finally {
      setAvatarBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <PageHeader title="My profile" subtitle={session.email ?? undefined} />

      <section className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-destiny-grey-900">
        <div className="mb-8 flex items-center gap-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10 text-lg font-black text-destiny-orange">
              {initials(name, session.email)}
            </div>
          )}
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={avatarBusy !== null}
                onClick={() => fileInput.current?.click()}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold text-destiny-grey transition hover:border-destiny-orange/40 hover:text-destiny-orange disabled:opacity-60 dark:border-white/10 dark:text-white"
              >
                {avatarBusy === "upload" ? "Uploading…" : "Change picture"}
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  disabled={avatarBusy !== null}
                  onClick={handleAvatarRemove}
                  className="rounded-full px-4 py-2 text-xs font-bold text-destiny-grey/50 transition hover:text-destiny-grey disabled:opacity-60 dark:text-white/50 dark:hover:text-white"
                >
                  {avatarBusy === "remove" ? "Removing…" : "Remove"}
                </button>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-destiny-grey/50 dark:text-white/50">
              JPEG, PNG, WebP or GIF, up to 5MB.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>
        </div>

        <form onSubmit={handleNameSubmit} className="max-w-sm space-y-3">
          <div>
            <label className={LABEL} htmlFor="admin-name">
              Name
            </label>
            <input
              id="admin-name"
              type="text"
              required
              value={name ?? ""}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
            />
          </div>
          <button
            type="submit"
            disabled={nameBusy || (name ?? "") === (session.name ?? "")}
            className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {nameBusy ? "Saving…" : "Update name"}
          </button>
        </form>
      </section>
    </div>
  );
}
