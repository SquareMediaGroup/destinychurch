"use client";

import { useEffect, useState } from "react";
import { PageHeader, MetricCard, PageLoading } from "@/components/admin/AdminUI";

interface BoardWithCounts {
  id: string;
  is_public: boolean;
  counts: { pending: number; approved: number; rejected: number };
}

export default function MediaAdminPage() {
  const [boards, setBoards] = useState<BoardWithCounts[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/media/boards")
      .then((res) => (res.ok ? res.json() : []))
      .then(setBoards)
      .catch(() => setBoards([]));
  }, []);

  if (!boards) return <PageLoading />;

  const pending = boards.reduce((sum, b) => sum + b.counts.pending, 0);
  const approved = boards.reduce((sum, b) => sum + b.counts.approved, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Media"
        subtitle="Photo boards and the upload moderation queue."
        back={{ href: "/admin", label: "Dashboard" }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          href="/admin/media/boards"
          icon="photo_library"
          iconColor="text-destiny-orange"
          iconBg="bg-destiny-orange/10"
          label="Boards"
          loading={false}
          value={boards.length}
        />
        <MetricCard
          href="/admin/media/queue"
          icon="hourglass_top"
          iconColor="text-warning"
          iconBg="bg-warning/10"
          label="Pending review"
          loading={false}
          value={pending}
        />
        <MetricCard
          icon="check_circle"
          iconColor="text-success"
          iconBg="bg-success/10"
          label="Approved photos"
          loading={false}
          value={approved}
        />
      </div>
    </div>
  );
}
