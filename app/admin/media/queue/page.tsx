"use client";

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import {
  PageHeader,
  EmptyState,
  ErrorNote,
  FilterChips,
  CardSkeleton,
  ghostBtn,
} from "@/components/admin/AdminUI";

interface Photo {
  id: string;
  url: string;
  file_name: string;
  uploader_name: string;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
  media_boards: { title: string; slug: string } | null;
}

type StatusFilter = "pending" | "approved" | "rejected" | "all";

export default function MediaQueuePage() {
  const { confirm, prompt } = useDialog();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPhotos = useCallback(async (s: StatusFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media/photos?status=${s}`);
      const data = await res.json();
      setPhotos(Array.isArray(data) ? data : []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos(status);
  }, [status, fetchPhotos]);

  async function handleApprove(photo: Photo) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    const res = await fetch(`/api/admin/media/photos/${photo.id}/approve`, { method: "POST" });
    if (!res.ok) {
      setError("Could not approve that photo.");
      fetchPhotos(status);
    }
  }

  async function handleReject(photo: Photo) {
    const reason = await prompt({
      title: "Decline photo",
      message: `Why is "${photo.file_name}" being declined? (optional)`,
      confirmLabel: "Decline",
    });
    if (reason === null) return;
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    const res = await fetch(`/api/admin/media/photos/${photo.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || null }),
    });
    if (!res.ok) {
      setError("Could not decline that photo.");
      fetchPhotos(status);
    }
  }

  async function handleDelete(photo: Photo) {
    if (
      !(await confirm({
        title: "Delete photo",
        message: `Permanently delete "${photo.file_name}"?`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    const res = await fetch(`/api/admin/media/photos/${photo.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete that photo.");
      fetchPhotos(status);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Moderation Queue"
        subtitle="Review photos before they appear on a board."
        back={{ href: "/admin/media", label: "Media" }}
      />

      <ErrorNote>{error}</ErrorNote>

      <div className="mb-6">
        <FilterChips
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Declined" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {loading ? (
        <CardSkeleton count={6} />
      ) : photos.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title={status === "pending" ? "Nothing to review" : "No photos"}
          hint={
            status === "pending"
              ? "New uploads will show up here for approval."
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800"
            >
              <div className="aspect-square bg-black/5 dark:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-bold text-destiny-grey dark:text-white">
                  {photo.uploader_name}
                </p>
                <p className="truncate text-[11px] text-destiny-grey/45 dark:text-white/45">
                  {photo.media_boards?.title ?? "Unknown board"}
                </p>
                {photo.reject_reason && (
                  <p className="mt-1 text-[11px] text-destiny-red">{photo.reject_reason}</p>
                )}
                <div className="mt-3 flex gap-2">
                  {photo.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(photo)}
                        className="flex-1 rounded-lg bg-success/10 py-1.5 text-xs font-bold text-success transition hover:bg-success/20"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(photo)}
                        className="flex-1 rounded-lg bg-danger/10 py-1.5 text-xs font-bold text-danger transition hover:bg-danger/20"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {photo.status !== "pending" && (
                    <button onClick={() => handleDelete(photo)} className={`${ghostBtn} w-full !py-1.5 text-xs`}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
