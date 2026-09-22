import AdminShell from "@/components/admin/AdminShell";

// Every admin page is signed-in, per-person and read over fetch on mount, so
// there is nothing to prerender — and the pages read useSearchParams() for
// their list filters, which fails a static prerender outright. Rendering the
// whole segment per request keeps it exactly as it was when the root layout
// made the entire site dynamic (see "Caching Strategy" in
// REPOSITORY_DOCUMENTATION.md).
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
