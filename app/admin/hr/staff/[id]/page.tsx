"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  API,
  fullName,
  formatDate,
  formatBytes,
  EMPLOYMENT_LABELS,
  STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  REVIEW_TYPE_LABELS,
  type Staff,
  type LeaveRequest,
  type HrDocument,
  type Review,
  type StaffStatus,
  type LeaveStatus,
} from "@/lib/hr";
import { PageHeader, Badge, ghostBtn, PageLoading } from "@/components/admin/AdminUI";
import {
  StaffModal,
  LeaveModal,
  DocumentModal,
  ReviewModal,
} from "@/components/admin/hr/modals";
import { useDialog } from "@/components/DialogProvider";

const STATUS_TONE: Record<StaffStatus, string> = {
  active: "green",
  on_leave: "orange",
  left: "grey",
};
const LEAVE_TONE: Record<LeaveStatus, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

type Modal = "edit" | "leave" | "document" | "review" | null;

export default function StaffProfilePage() {
  const { confirm } = useDialog();
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [docs, setDocs] = useState<HrDocument[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    const sRes = await fetch(`${API}/staff/${id}`);
    if (!sRes.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const [s, l, d, r] = await Promise.all([
      sRes.json(),
      fetch(`${API}/leave?staff_id=${id}`).then((x) => x.json()),
      fetch(`${API}/documents?staff_id=${id}`).then((x) => x.json()),
      fetch(`${API}/reviews?staff_id=${id}`).then((x) => x.json()),
    ]);
    setStaff(s);
    setLeave(Array.isArray(l) ? l : []);
    setDocs(Array.isArray(d) ? d : []);
    setReviews(Array.isArray(r) ? r : []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link (…/staff/{id}?edit=1) opens the edit modal straight away so
  // backend-access changes are one click away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("edit")) {
      setModal("edit");
    }
  }, []);

  async function openDoc(docId: string) {
    const res = await fetch(`${API}/documents/${docId}`);
    if (!res.ok) return setError("Could not open document.");
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank", "noopener");
  }

  async function deleteDoc(docId: string) {
    if (
      !(await confirm({
        title: "Delete document",
        message: "Delete this document?",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    await fetch(`${API}/documents/${docId}`, { method: "DELETE" });
    load();
  }

  function afterSave() {
    setModal(null);
    setError("");
    load();
  }

  if (loading) return <PageLoading label="Loading staff member" />;
  if (notFound || !staff)
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          title="Staff member not found"
          back={{ href: "/admin/hr/staff", label: "Staff directory" }}
        />
      </div>
    );

  const used = leave
    .filter((l) => l.status === "approved" && l.type === "holiday")
    .reduce((sum, l) => sum + Number(l.days || 0), 0);
  const remaining = Number(staff.annual_leave_entitlement) - used;

  const details = [
    { label: "Job title", value: staff.job_title || "—" },
    { label: "Department", value: staff.department || "—" },
    { label: "Employment", value: EMPLOYMENT_LABELS[staff.employment_type] },
    { label: "Email", value: staff.email || "—" },
    { label: "Phone", value: staff.phone || "—" },
    { label: "Start date", value: formatDate(staff.start_date) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title={fullName(staff)}
        back={{ href: "/admin/hr/staff", label: "Staff directory" }}
        action={
          <button className={ghostBtn} onClick={() => setModal("edit")}>
            <span className="material-symbols-rounded text-lg">edit</span>
            Edit
          </button>
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <Badge tone={STATUS_TONE[staff.status]}>{STATUS_LABELS[staff.status]}</Badge>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm text-destiny-red">
          {error}
        </p>
      )}

      {/* Details */}
      <section className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {details.map((d) => (
            <div key={d.label}>
              <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
                {d.label}
              </p>
              <p className="mt-0.5 text-sm text-destiny-grey">{d.value}</p>
            </div>
          ))}
        </div>
        {staff.notes && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-destiny-grey/70">
              {staff.notes}
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leave */}
        <Section
          title="Leave"
          meta={`${remaining} / ${staff.annual_leave_entitlement} days left`}
          onAdd={() => setModal("leave")}
          addLabel="Request"
        >
          {leave.length === 0 ? (
            <Empty>No leave requests.</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {leave.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-bold text-destiny-grey">
                      {LEAVE_TYPE_LABELS[l.type]} · {Number(l.days)} day(s)
                    </p>
                    <p className="text-xs text-destiny-grey/45">
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                    </p>
                  </div>
                  <Badge tone={LEAVE_TONE[l.status]}>
                    {LEAVE_STATUS_LABELS[l.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Documents */}
        <Section title="Documents" onAdd={() => setModal("document")} addLabel="Upload">
          {docs.length === 0 ? (
            <Empty>No documents.</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-destiny-grey">
                      {d.title}
                    </p>
                    <p className="text-xs text-destiny-grey/45">
                      {DOCUMENT_CATEGORY_LABELS[d.category]} · {formatBytes(d.size_bytes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openDoc(d.id)}
                      className="text-destiny-grey/40 transition hover:text-destiny-orange"
                      aria-label="Download"
                    >
                      <span className="material-symbols-rounded text-xl">download</span>
                    </button>
                    <button
                      onClick={() => deleteDoc(d.id)}
                      className="text-destiny-grey/40 transition hover:text-destiny-red"
                      aria-label="Delete"
                    >
                      <span className="material-symbols-rounded text-xl">delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Reviews */}
        <Section title="Reviews & 1-to-1s" onAdd={() => setModal("review")} addLabel="Log">
          {reviews.length === 0 ? (
            <Empty>No reviews logged.</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {reviews.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-destiny-grey">
                      {REVIEW_TYPE_LABELS[r.type]}
                    </p>
                    <span className="text-xs text-destiny-grey/45">
                      {formatDate(r.review_date)}
                    </span>
                  </div>
                  {r.summary && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-destiny-grey/65">
                      {r.summary}
                    </p>
                  )}
                  {r.next_review_date && (
                    <p className="mt-1 text-xs font-bold text-destiny-grey/45">
                      Next: {formatDate(r.next_review_date)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {modal === "edit" && (
        <StaffModal staff={staff} onClose={() => setModal(null)} onSaved={afterSave} onError={setError} />
      )}
      {modal === "leave" && (
        <LeaveModal fixedStaff={staff} onClose={() => setModal(null)} onSaved={afterSave} onError={setError} />
      )}
      {modal === "document" && (
        <DocumentModal fixedStaff={staff} onClose={() => setModal(null)} onSaved={afterSave} onError={setError} />
      )}
      {modal === "review" && (
        <ReviewModal fixedStaff={staff} onClose={() => setModal(null)} onSaved={afterSave} onError={setError} />
      )}
    </div>
  );
}

function Section({
  title,
  meta,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  meta?: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-black text-destiny-grey">{title}</h2>
          {meta && <p className="text-xs text-destiny-grey/45">{meta}</p>}
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-bold text-destiny-orange transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-base">add</span>
          {addLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-destiny-grey/40">{children}</p>;
}
