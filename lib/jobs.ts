// Shared types, labels and helpers for the recruitment module.
// Client-safe (no server-only imports) — used by admin client pages and the
// public pages alike. Server-side data fetchers live in `lib/jobs.server.ts`.

export type JobKind = "job" | "internship";
export type JobEmploymentType =
  | "full_time"
  | "part_time"
  | "volunteer"
  | "contractor"
  | "fixed_term";
export type ApplicationStatus =
  | "new"
  | "reviewing"
  | "shortlisted"
  | "rejected"
  | "hired";

export interface Job {
  id: string;
  title: string;
  slug: string;
  kind: JobKind;
  department: string | null;
  employment_type: JobEmploymentType;
  location: string | null;
  hours: string | null;
  salary: string | null;
  summary: string | null;
  description: string | null;
  closing_date: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  job_id: string | null;
  job_title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  cv_path: string | null;
  cv_name: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export const KIND_LABELS: Record<JobKind, string> = {
  job: "Job",
  internship: "Internship",
};

export const EMPLOYMENT_LABELS: Record<JobEmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  volunteer: "Volunteer",
  contractor: "Contractor",
  fixed_term: "Fixed-term",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, string> = {
  new: "blue",
  reviewing: "orange",
  shortlisted: "green",
  rejected: "red",
  hired: "green",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Has this role's closing date passed? */
export function isClosed(job: Pick<Job, "closing_date">): boolean {
  if (!job.closing_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(job.closing_date) < today;
}

export const API = "/api/administration/hr";
