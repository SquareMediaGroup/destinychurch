"use client";

// These primitives moved to components/admin/AdminUI.tsx — they were never
// HR-specific (Posts and Training imported `HrHeader` for their page headers,
// which read as if those pages were part of HR).
//
// This file stays as a re-export so the existing imports across HR, Posts and
// Training keep working. `HrHeader` is the old name for `PageHeader`.
// New code should import from "@/components/admin/AdminUI".

export {
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
  dangerBtn,
  iconBtn,
  cardClass,
  PageHeader,
  PageHeader as HrHeader,
  Badge,
  Modal,
  EmptyState,
  ErrorNote,
  SearchInput,
  FilterChips,
  ListToolbar,
  SortHeader,
  TableSkeleton,
  CardSkeleton,
  Toggle,
  BulkBar,
  Kbd,
} from "@/components/admin/AdminUI";

export type { FilterOption } from "@/components/admin/AdminUI";
