"use client";

import { useEffect, useState } from "react";
import {
  API,
  fullName,
  dayCount,
  EMPLOYMENT_LABELS,
  STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  REVIEW_TYPE_LABELS,
  type Staff,
  type EmploymentType,
  type StaffStatus,
  type LeaveType,
  type DocumentCategory,
  type ReviewType,
} from "@/lib/hr";
import {
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "./HrUI";

type SavedHandler = () => void;
type ErrorHandler = (msg: string) => void;

async function send(
  url: string,
  method: string,
  body: unknown,
  onSaved: SavedHandler,
  onError: ErrorHandler,
  setSaving: (b: boolean) => void,
) {
  setSaving(true);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  setSaving(false);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    onError(data.error || "Something went wrong.");
    return;
  }
  onSaved();
}

function StaffPicker({
  value,
  onChange,
  staffList,
}: {
  value: string;
  onChange: (v: string) => void;
  staffList: Staff[];
}) {
  return (
    <div>
      <label className={labelClass}>Staff member</label>
      <select
        className={inputClass}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {staffList.map((s) => (
          <option key={s.id} value={s.id}>
            {fullName(s)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Staff ────────────────────────────────────────────────────────────────
export function StaffModal({
  staff,
  onClose,
  onSaved,
  onError,
}: {
  staff: Staff | null;
  onClose: () => void;
  onSaved: SavedHandler;
  onError: ErrorHandler;
}) {
  const [form, setForm] = useState({
    first_name: staff?.first_name ?? "",
    last_name: staff?.last_name ?? "",
    email: staff?.email ?? "",
    phone: staff?.phone ?? "",
    job_title: staff?.job_title ?? "",
    department: staff?.department ?? "",
    employment_type: (staff?.employment_type ?? "full_time") as EmploymentType,
    status: (staff?.status ?? "active") as StaffStatus,
    start_date: staff?.start_date ?? "",
    annual_leave_entitlement: staff?.annual_leave_entitlement ?? 28,
    notes: staff?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const currentlyLinkedToAdmin = Boolean(staff?.linked_admin_email);
  const [loginMode, setLoginMode] = useState<"new" | "link">(
    currentlyLinkedToAdmin ? "link" : "new",
  );
  const [linkedAdminId, setLinkedAdminId] = useState(
    currentlyLinkedToAdmin ? (staff?.auth_user_id ?? "") : "",
  );
  const [password, setPassword] = useState("");
  const [loginTouched, setLoginTouched] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState<
    { id: string; email: string | null; roles: string[] }[]
  >([]);

  useEffect(() => {
    const params = staff ? `?excludeStaffId=${staff.id}` : "";
    fetch(`${API}/staff/available-admins${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAvailableAdmins)
      .catch(() => setAvailableAdmins([]));
  }, [staff]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(
      staff ? `${API}/staff/${staff.id}` : `${API}/staff`,
      staff ? "PATCH" : "POST",
      {
        ...form,
        start_date: form.start_date || null,
        annual_leave_entitlement: Number(form.annual_leave_entitlement) || 0,
        login_mode: !staff || loginTouched ? loginMode : undefined,
        password: password || undefined,
        linked_admin_auth_user_id: loginMode === "link" ? linkedAdminId : undefined,
      },
      onSaved,
      onError,
      setSaving,
    );
  }

  return (
    <Modal title={staff ? "Edit staff" : "Add staff"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First name</label>
            <input
              className={inputClass}
              required
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input
              className={inputClass}
              required
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Job title</label>
            <input
              className={inputClass}
              value={form.job_title}
              onChange={(e) => set("job_title", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <input
              className={inputClass}
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Employment type</label>
            <select
              className={inputClass}
              value={form.employment_type}
              onChange={(e) => set("employment_type", e.target.value as EmploymentType)}
            >
              {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => set("status", e.target.value as StaffStatus)}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Start date</label>
            <input
              type="date"
              className={inputClass}
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Annual leave (days)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className={inputClass}
              value={form.annual_leave_entitlement}
              onChange={(e) => set("annual_leave_entitlement", Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            rows={3}
            className={inputClass}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        {/* Backend access — mandatory login, either new or linked to an existing admin */}
        <div className="rounded-xl border border-black/10 bg-[#f5f7fa]/70 p-4">
          <span className="block text-sm font-bold text-destiny-grey dark:text-white">
            Sign-in
          </span>
          {staff && (
            <p className="mt-0.5 text-xs text-destiny-grey/50 dark:text-white/50">
              Currently:{" "}
              {currentlyLinkedToAdmin
                ? `linked to ${staff.linked_admin_email} (${staff.linked_admin_roles?.join(", ") || "no roles"})`
                : "their own login"}
            </p>
          )}

          <div className="mt-3 flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-destiny-grey dark:text-white">
              <input
                type="radio"
                name="login_mode"
                checked={loginMode === "new"}
                onChange={() => {
                  setLoginMode("new");
                  setLoginTouched(true);
                }}
                className="h-4 w-4 accent-destiny-orange"
              />
              {staff && !currentlyLinkedToAdmin ? "Own login" : "Create a new login"}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-destiny-grey dark:text-white">
              <input
                type="radio"
                name="login_mode"
                checked={loginMode === "link"}
                onChange={() => {
                  setLoginMode("link");
                  setLoginTouched(true);
                }}
                className="h-4 w-4 accent-destiny-orange"
              />
              Link an existing admin
            </label>
          </div>

          {loginMode === "new" && (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginTouched(true);
                  }}
                  placeholder={
                    staff?.has_login && !currentlyLinkedToAdmin
                      ? "Leave blank to keep current"
                      : "Set a password (min 8 characters)"
                  }
                />
                {(!staff || currentlyLinkedToAdmin) && !form.email && (
                  <p className="mt-1.5 text-xs text-destiny-red">
                    An email address (above) is required to create a login.
                  </p>
                )}
              </div>
            </div>
          )}

          {loginMode === "link" && (
            <div className="mt-4">
              <label className={labelClass}>Admin</label>
              <select
                className={inputClass}
                value={linkedAdminId}
                onChange={(e) => {
                  setLinkedAdminId(e.target.value);
                  setLoginTouched(true);
                }}
              >
                <option value="">Select…</option>
                {availableAdmins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email} — {a.roles.join(", ") || "no roles"}
                  </option>
                ))}
              </select>
              {availableAdmins.length === 0 && (
                <p className="mt-1.5 text-xs text-destiny-grey/50 dark:text-white/50">
                  No unlinked admins available — add one under Users first.
                </p>
              )}
            </div>
          )}
        </div>

        <Actions onClose={onClose} saving={saving} label={staff ? "Save changes" : "Add staff"} />
      </form>
    </Modal>
  );
}

// ── Leave ──────────────────────────────────────────────────────────────────
export function LeaveModal({
  fixedStaff,
  staffList,
  onClose,
  onSaved,
  onError,
}: {
  fixedStaff?: Staff;
  staffList?: Staff[];
  onClose: () => void;
  onSaved: SavedHandler;
  onError: ErrorHandler;
}) {
  const [form, setForm] = useState({
    staff_id: fixedStaff?.id ?? "",
    type: "holiday" as LeaveType,
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(
      `${API}/leave`,
      "POST",
      { ...form, days: dayCount(form.start_date, form.end_date) },
      onSaved,
      onError,
      setSaving,
    );
  }

  return (
    <Modal title="Request leave" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {fixedStaff ? (
          <p className="text-sm text-destiny-grey/60 dark:text-white/60">
            For <span className="font-bold text-destiny-grey dark:text-white">{fullName(fixedStaff)}</span>
          </p>
        ) : (
          <StaffPicker
            value={form.staff_id}
            onChange={(v) => set("staff_id", v)}
            staffList={staffList ?? []}
          />
        )}
        <div>
          <label className={labelClass}>Type</label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => set("type", e.target.value as LeaveType)}
          >
            {Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>From</label>
            <input
              type="date"
              required
              className={inputClass}
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              type="date"
              required
              className={inputClass}
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </div>
        </div>
        {form.start_date && form.end_date && (
          <p className="text-xs text-destiny-grey/50 dark:text-white/50">
            {dayCount(form.start_date, form.end_date)} day(s)
          </p>
        )}
        <div>
          <label className={labelClass}>Reason</label>
          <textarea
            rows={2}
            className={inputClass}
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        </div>
        <Actions onClose={onClose} saving={saving} label="Submit request" />
      </form>
    </Modal>
  );
}

// ── Document ───────────────────────────────────────────────────────────────
export function DocumentModal({
  fixedStaff,
  staffList,
  onClose,
  onSaved,
  onError,
}: {
  fixedStaff?: Staff;
  staffList?: Staff[];
  onClose: () => void;
  onSaved: SavedHandler;
  onError: ErrorHandler;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [staffId, setStaffId] = useState(fixedStaff?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      onError("Please choose a file.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    fd.append("category", category);
    if (staffId) fd.append("staff_id", staffId);
    const res = await fetch(`${API}/documents`, { method: "POST", body: fd });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error || "Upload failed.");
      return;
    }
    onSaved();
  }

  return (
    <Modal title="Upload document" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Category</label>
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            >
              {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {!fixedStaff && (
            <div>
              <label className={labelClass}>Staff (optional)</label>
              <select
                className={inputClass}
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              >
                <option value="">Org-wide</option>
                {(staffList ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {fullName(s)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>File</label>
          <input
            type="file"
            required
            accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-destiny-grey/70 dark:text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-destiny-orange/10 file:px-3 file:py-2 file:text-sm file:font-bold file:text-destiny-orange"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-destiny-grey/40 dark:text-white/40">
            PDF, Word or image, up to 20MB. Stored privately.
          </p>
        </div>
        <Actions onClose={onClose} saving={saving} label="Upload" />
      </form>
    </Modal>
  );
}

// ── Review ─────────────────────────────────────────────────────────────────
export function ReviewModal({
  fixedStaff,
  staffList,
  onClose,
  onSaved,
  onError,
}: {
  fixedStaff?: Staff;
  staffList?: Staff[];
  onClose: () => void;
  onSaved: SavedHandler;
  onError: ErrorHandler;
}) {
  const [form, setForm] = useState({
    staff_id: fixedStaff?.id ?? "",
    review_date: new Date().toISOString().slice(0, 10),
    type: "one_to_one" as ReviewType,
    reviewer: "",
    summary: "",
    next_review_date: "",
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(
      `${API}/reviews`,
      "POST",
      { ...form, next_review_date: form.next_review_date || null },
      onSaved,
      onError,
      setSaving,
    );
  }

  return (
    <Modal title="Log review" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {fixedStaff ? (
          <p className="text-sm text-destiny-grey/60 dark:text-white/60">
            For <span className="font-bold text-destiny-grey dark:text-white">{fullName(fixedStaff)}</span>
          </p>
        ) : (
          <StaffPicker
            value={form.staff_id}
            onChange={(v) => set("staff_id", v)}
            staffList={staffList ?? []}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => set("type", e.target.value as ReviewType)}
            >
              {Object.entries(REVIEW_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              required
              className={inputClass}
              value={form.review_date}
              onChange={(e) => set("review_date", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Reviewer</label>
          <input
            className={inputClass}
            value={form.reviewer}
            onChange={(e) => set("reviewer", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Summary</label>
          <textarea
            rows={3}
            className={inputClass}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Next review date</label>
          <input
            type="date"
            className={inputClass}
            value={form.next_review_date}
            onChange={(e) => set("next_review_date", e.target.value)}
          />
        </div>
        <Actions onClose={onClose} saving={saving} label="Save review" />
      </form>
    </Modal>
  );
}

function Actions({
  onClose,
  saving,
  label,
}: {
  onClose: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="mt-1 flex justify-end gap-2">
      <button type="button" className={ghostBtn} onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className={primaryBtn} disabled={saving}>
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}