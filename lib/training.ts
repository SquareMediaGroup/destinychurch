// Shared types, labels and helpers for the Training module.
// Client-safe (no server-only imports) — used by admin client pages and the
// public pages alike. Server-side data fetchers live in `lib/training.server.ts`.

export { slugify } from "@/lib/jobs";

export interface TrainingCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// Public/admin-safe shape — never carries password_hash, just whether one is set.
export interface TrainingSubgroup {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  has_password: boolean;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingFolder {
  id: string;
  subgroup_id: string;
  name: string;
  sort_order: number;
}

export interface TrainingPost {
  id: string;
  subgroup_id: string;
  folder_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// A category with its sub-groups nested, used by the public overview.
export interface TrainingCategoryWithSubgroups extends TrainingCategory {
  subgroups: TrainingSubgroup[];
}

export const API = "/api/administration/training";
