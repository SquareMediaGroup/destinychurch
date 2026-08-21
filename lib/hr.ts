// Shared types and labels for the HR module.

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "volunteer"
  | "contractor";
export type StaffStatus = "active" | "on_leave" | "left";
export type LeaveType = "holiday" | "sick" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type DocumentCategory = "contract" | "policy" | "payslip" | "other";
export type ReviewType = "appraisal" | "one_to_one";
export type ChecklistKind = "onboarding" | "offboarding";

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  employment_type: EmploymentType;
  status: StaffStatus;
  start_date: string | null;
  end_date: string | null;
  annual_leave_entitlement: number;
  notes: string | null;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Enrichment-only (derived from the linked auth user, not stored on hr_staff):
  has_login?: boolean;
}

interface StaffRef {
  hr_staff?: { first_name: string; last_name: string } | null;
}

export interface LeaveRequest extends StaffRef {
  id: string;
  staff_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface HrDocument extends StaffRef {
  id: string;
  staff_id: string | null;
  title: string;
  category: DocumentCategory;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Review extends StaffRef {
  id: string;
  staff_id: string;
  review_date: string;
  type: ReviewType;
  reviewer: string | null;
  summary: string | null;
  next_review_date: string | null;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  kind: ChecklistKind;
  created_at: string;
  updated_at: string;
  // Enrichment-only, from a joined query — not a column on the table.
  items?: ChecklistTemplateItem[];
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  label: string;
  sort_order: number;
}

export interface ChecklistItem {
  id: string;
  staff_id: string;
  kind: ChecklistKind;
  label: string;
  is_done: boolean;
  done_at: string | null;
  due_date: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  volunteer: "Volunteer",
  contractor: "Contractor",
};

export const STATUS_LABELS: Record<StaffStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  left: "Left",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  holiday: "Holiday",
  sick: "Sick",
  other: "Other",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contract: "Contract",
  policy: "Policy",
  payslip: "Payslip",
  other: "Other",
};

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  appraisal: "Appraisal",
  one_to_one: "1-to-1",
};

export const CHECKLIST_KIND_LABELS: Record<ChecklistKind, string> = {
  onboarding: "Onboarding",
  offboarding: "Offboarding",
};

export const API = "/api/admin/hr";
export const PORTAL_API = "/api/portal";

export function fullName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name}`.trim();
}

/** Holiday days remaining: entitlement minus approved holiday leave taken. */
export function leaveRemaining(
  staff: Pick<Staff, "annual_leave_entitlement">,
  leave: Pick<LeaveRequest, "status" | "type" | "days">[],
): number {
  const used = leave
    .filter((l) => l.status === "approved" && l.type === "holiday")
    .reduce((sum, l) => sum + Number(l.days || 0), 0);
  return Number(staff.annual_leave_entitlement) - used;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Inclusive whole-day count between two ISO dates (weekends included).
export function dayCount(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return diff > 0 ? diff : 0;
}
