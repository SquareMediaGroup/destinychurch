"use client";

import { useEffect, useRef, useState } from "react";
import {
  PORTAL_API,
  fullName,
  formatDate,
  leaveRemaining,
  EMPLOYMENT_LABELS,
  LEAVE_STATUS_LABELS,
  type Staff,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/hr";
import { PageHeader, Badge, PageLoading, ErrorNote, Modal } from "@/components/admin/AdminUI";
import { useToast } from "@/components/ToastProvider";

const LEAVE_TONE: Record<LeaveStatus, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

const FIELD =
  "w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20";
const LABEL = "mb-1.5 block text-sm font-bold text-destiny-grey";

export default function PortalProfilePage() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "My Portal | Destiny Church";
  }, []);

  function load() {
    return Promise.all([
      fetch(`${PORTAL_API}/me`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch(`${PORTAL_API}/leave`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, l]) => {
        setStaff(s);
        setLeave(Array.isArray(l) ? l : []);
      })
      .catch(() => setError("Could not load your profile."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <PageLoading label="Loading your profile" />;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <PageHeader
        title={staff ? fullName(staff) : "My profile"}
        subtitle={staff?.job_title || undefined}
      />

      <ErrorNote>{error}</ErrorNote>

      {staff && (
        <>
          <section className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Department" value={staff.department || "—"} />
              <Field label="Employment" value={EMPLOYMENT_LABELS[staff.employment_type]} />
              <Field label="Start date" value={formatDate(staff.start_date)} />
              <Field label="Email" value={staff.email || "—"} />
              <Field label="Phone" value={staff.phone || "—"} />
              <Field
                label="Holiday remaining"
                value={`${leaveRemaining(staff, leave)} / ${staff.annual_leave_entitlement} days`}
              />
            </div>
          </section>

          <AccountSettings staff={staff} onChange={(s) => setStaff(s)} />

          <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-black text-destiny-grey">Recent leave</h2>
            {leave.length === 0 ? (
              <p className="text-sm text-destiny-grey/40">No leave requests yet.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {leave.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5">
                    <p className="text-xs text-destiny-grey/45">
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                    </p>
                    <Badge tone={LEAVE_TONE[l.status]}>{LEAVE_STATUS_LABELS[l.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">{label}</p>
      <p className="mt-0.5 text-sm text-destiny-grey">{value}</p>
    </div>
  );
}

function initials(staff: Staff): string {
  return `${staff.first_name[0] ?? ""}${staff.last_name[0] ?? ""}`.toUpperCase();
}

function AccountSettings({
  staff,
  onChange,
}: {
  staff: Staff;
  onChange: (staff: Staff) => void;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState<"upload" | "remove" | null>(null);

  const [email, setEmail] = useState(staff.email ?? "");
  const [emailBusy, setEmailBusy] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  function closePasswordModal() {
    setPasswordModalOpen(false);
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setPasswordError("");
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarBusy("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/portal/me/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't upload that image", tone: "error" });
        return;
      }
      onChange({ ...staff, avatar_url: data.avatar_url });
      toast.push({ message: "Profile picture updated", tone: "success" });
    } finally {
      setAvatarBusy(null);
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy("remove");
    try {
      const res = await fetch("/api/portal/me/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't remove that image", tone: "error" });
        return;
      }
      onChange({ ...staff, avatar_url: null });
    } finally {
      setAvatarBusy(null);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailBusy(true);
    try {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't update your email", tone: "error" });
        return;
      }
      onChange({ ...staff, email });
      toast.push({
        message: "Check your inbox to confirm the new email address",
        tone: "success",
      });
    } finally {
      setEmailBusy(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordBusy(true);
    try {
      const res = await fetch("/api/portal/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "Couldn't update your password");
        return;
      }
      closePasswordModal();
      toast.push({ message: "Password updated", tone: "success" });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-5 font-black text-destiny-grey">Account</h2>

      <div className="mb-8 flex items-center gap-5">
        {staff.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staff.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10 text-lg font-black text-destiny-orange">
            {initials(staff)}
          </div>
        )}
        <div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={avatarBusy !== null}
              onClick={() => fileInput.current?.click()}
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold text-destiny-grey transition hover:border-destiny-orange/40 hover:text-destiny-orange disabled:opacity-60"
            >
              {avatarBusy === "upload" ? "Uploading…" : "Change picture"}
            </button>
            {staff.avatar_url ? (
              <button
                type="button"
                disabled={avatarBusy !== null}
                onClick={handleAvatarRemove}
                className="rounded-full px-4 py-2 text-xs font-bold text-destiny-grey/50 transition hover:text-destiny-grey disabled:opacity-60"
              >
                {avatarBusy === "remove" ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-destiny-grey/50">JPEG, PNG, WebP or GIF, up to 5MB.</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label className={LABEL} htmlFor="account-email">
              Email
            </label>
            <input
              id="account-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
          </div>
          <button
            type="submit"
            disabled={emailBusy || email === (staff.email ?? "")}
            className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {emailBusy ? "Saving…" : "Update email"}
          </button>
        </form>

        <div>
          <p className={LABEL}>Password</p>
          <p className="mb-3 text-sm text-destiny-grey/50">••••••••</p>
          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange/40 hover:text-destiny-orange"
          >
            Change password
          </button>
        </div>
      </div>

      {passwordModalOpen ? (
        <Modal title="Change password" onClose={closePasswordModal}>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-sm text-destiny-grey/60">
              Enter your current password to confirm it&apos;s you, then choose a new one.
            </p>

            <div>
              <label className={LABEL} htmlFor="account-current-password">
                Current password
              </label>
              <input
                id="account-current-password"
                type="password"
                required
                autoFocus
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="account-password">
                New password
              </label>
              <input
                id="account-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="account-password-confirm">
                Confirm new password
              </label>
              <input
                id="account-password-confirm"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={FIELD}
              />
            </div>

            {passwordError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
                {passwordError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closePasswordModal}
                className="rounded-full px-5 py-2.5 text-sm font-bold text-destiny-grey/60 transition hover:text-destiny-grey"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordBusy || !currentPassword || !password || !confirmPassword}
                className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {passwordBusy ? "Saving…" : "Update password"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
