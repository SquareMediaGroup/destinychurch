"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, PageLoading, ErrorNote, EmptyState } from "@/components/admin/AdminUI";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  department: string | null;
  email: string | null;
  avatar_url: string | null;
  status: "active" | "on_leave" | "left";
}

const FIELD =
  "w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20";

function initials(m: TeamMember): string {
  return `${m.first_name[0] ?? ""}${m.last_name[0] ?? ""}`.toUpperCase();
}

export default function PortalTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Team | Destiny Church";
  }, []);

  useEffect(() => {
    fetch("/api/portal/team")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setTeam(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not load the team directory."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return team;
    return team.filter((m) =>
      [`${m.first_name} ${m.last_name}`, m.job_title, m.department]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [team, search]);

  if (loading) return <PageLoading label="Loading the team" />;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader title="Team" subtitle="Everyone with a portal login." />

      <ErrorNote>{error}</ErrorNote>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, role or department"
        className={`${FIELD} mb-6`}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="groups"
          title={search ? "Nobody matches that" : "No colleagues yet"}
          hint={search ? "Try a different name or department." : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm"
            >
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.avatar_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10 text-sm font-black text-destiny-orange">
                  {initials(m)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-destiny-grey">
                  {m.first_name} {m.last_name}
                  {m.status === "on_leave" ? (
                    <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destiny-grey/50">
                      On leave
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-destiny-grey/50">
                  {[m.job_title, m.department].filter(Boolean).join(" · ") || "—"}
                </p>
                {m.email ? (
                  <a
                    href={`mailto:${m.email}`}
                    className="mt-0.5 block truncate text-xs font-bold text-destiny-orange hover:underline"
                  >
                    {m.email}
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
