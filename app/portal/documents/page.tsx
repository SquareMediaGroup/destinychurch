"use client";

import { useEffect, useState } from "react";
import {
  PORTAL_API,
  formatDate,
  formatBytes,
  DOCUMENT_CATEGORY_LABELS,
  type HrDocument,
} from "@/lib/hr";
import { PageHeader, EmptyState, ErrorNote, PageLoading } from "@/components/admin/AdminUI";

type PortalDocument = Pick<
  HrDocument,
  "id" | "title" | "category" | "mime_type" | "size_bytes" | "created_at"
>;

export default function PortalDocumentsPage() {
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Documents | Destiny Church";
  }, []);

  useEffect(() => {
    fetch(`${PORTAL_API}/documents`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function open(doc: PortalDocument) {
    setError("");
    const res = await fetch(`${PORTAL_API}/documents/${doc.id}`);
    if (!res.ok) {
      setError("Could not open that document.");
      return;
    }
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank", "noopener");
  }

  if (loading) return <PageLoading label="Loading your documents" />;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader title="Documents" subtitle="Your files, and anything shared with everyone." />

      <ErrorNote>{error}</ErrorNote>

      {docs.length === 0 ? (
        <EmptyState icon="folder_open" title="No documents yet" />
      ) : (
        <ul className="flex flex-col gap-3">
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => open(d)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition hover:border-destiny-orange/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-destiny-grey">{d.title}</p>
                  <p className="text-xs text-destiny-grey/45">
                    {DOCUMENT_CATEGORY_LABELS[d.category]} · {formatBytes(d.size_bytes)} ·{" "}
                    {formatDate(d.created_at)}
                  </p>
                </div>
                <span className="material-symbols-rounded shrink-0 text-destiny-grey/30">
                  download
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
