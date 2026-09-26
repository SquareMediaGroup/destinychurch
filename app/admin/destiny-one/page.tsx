"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PageHeader, MetricCard, ErrorNote, cardClass } from "@/components/admin/AdminUI";
import { fetchAdminJson, useAdminLoader } from "@/lib/useAdminLoader";
import { ADMIN_GROUPS } from "@/lib/adminNav";
import { ADMIN_API, type AdminOverview } from "@/lib/destinyOne/adminTypes";

/** The Destiny One group from the nav registry, minus this landing page. */
const SECTIONS =
  ADMIN_GROUPS.find((g) => g.label === "Destiny One")?.items.filter((i) => i.href !== "/admin/destiny-one") ?? [];

export default function DestinyOneOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const load = useCallback(async () => {
    setData(await fetchAdminJson<AdminOverview>(`${ADMIN_API}/overview`));
  }, []);
  const { loading, error } = useAdminLoader(load);
  const busy = loading || !data;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Destiny One"
        subtitle="The members' app for teams and groups. Staff verify everyone here; message content is only ever visible to Safeguarding."
      />
      <ErrorNote>{error}</ErrorNote>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          href="/admin/destiny-one/requests"
          icon="how_to_reg"
          iconColor="text-destiny-orange"
          iconBg="bg-destiny-orange/10"
          label="Waiting for approval"
          loading={busy}
          value={data?.pendingRequests ?? 0}
          chip={data?.pendingRequests ? { text: "Action needed", tone: "active" } : undefined}
        />
        <MetricCard
          href="/admin/destiny-one/members"
          icon="group"
          iconColor="text-destiny-blue"
          iconBg="bg-destiny-blue/10"
          label="Active members"
          loading={busy}
          value={data?.activeMembers ?? 0}
          chip={data?.suspended ? { text: `${data.suspended} suspended`, tone: "muted" } : undefined}
        />
        <MetricCard
          href="/admin/destiny-one/invites"
          icon="outgoing_mail"
          iconColor="text-destiny-purple"
          iconBg="bg-destiny-purple/10"
          label="Open invites"
          loading={busy}
          value={data?.openInvites ?? 0}
        />
        <MetricCard
          href="/admin/destiny-one/communities"
          icon="pause_circle"
          iconColor={data?.pausedGroups ? "text-danger" : "text-destiny-green"}
          iconBg={data?.pausedGroups ? "bg-danger/10" : "bg-destiny-green/10"}
          label="Paused groups"
          loading={busy}
          value={data?.pausedGroups ?? 0}
          chip={data ? { text: `${data.groups} groups in ${data.communities} communities`, tone: "muted" } : undefined}
        />
      </div>

      {data && data.unsubmittedSignIns > 0 && (
        <p className="mt-4 text-sm text-destiny-grey/55 dark:text-white/55">
          {data.unsubmittedSignIns} {data.unsubmittedSignIns === 1 ? "person has" : "people have"} signed in but not yet
          filled in an access request.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className={`${cardClass} flex gap-4 p-5 transition hover:shadow-md`}>
            <span className="material-symbols-rounded text-2xl text-destiny-grey/50 dark:text-white/50" aria-hidden="true">
              {s.icon}
            </span>
            <span>
              <span className="block font-bold text-destiny-grey dark:text-white">{s.label}</span>
              <span className="mt-0.5 block text-sm text-destiny-grey/55 dark:text-white/55">{s.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
