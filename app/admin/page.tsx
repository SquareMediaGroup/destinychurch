"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  redirects: { total: number; active: number };
  sermons: { total: number; hidden: number };
  builderPages: { total: number; published: number };
  alphaEvents: { total: number; upcoming: number };
  banner: { active: boolean; type: string; message: string };
  popup: { active: boolean; title: string };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [redirectsRes, sermonsRes, builderRes, alphaRes, bannerRes, popupRes] =
          await Promise.allSettled([
            fetch("/api/admin/redirects"),
            fetch("/api/admin/sermons"),
            fetch("/api/admin/builder/pages"),
            fetch("/api/admin/alpha-events"),
            fetch("/api/admin/banner"),
            fetch("/api/admin/popup"),
          ]);

        const redirectsData =
          redirectsRes.status === "fulfilled" && redirectsRes.value.ok
            ? await redirectsRes.value.json()
            : [];
        const sermonsData =
          sermonsRes.status === "fulfilled" && sermonsRes.value.ok
            ? await sermonsRes.value.json()
            : [];
        const builderData =
          builderRes.status === "fulfilled" && builderRes.value.ok
            ? await builderRes.value.json()
            : { pages: [] };
        const alphaData =
          alphaRes.status === "fulfilled" && alphaRes.value.ok
            ? await alphaRes.value.json()
            : [];
        const bannerData =
          bannerRes.status === "fulfilled" && bannerRes.value.ok
            ? await bannerRes.value.json()
            : { active: false, type: "announcement", message: "" };
        const popupData =
          popupRes.status === "fulfilled" && popupRes.value.ok
            ? await popupRes.value.json()
            : { active: false, title: "" };

        const redirectsArr = Array.isArray(redirectsData) ? redirectsData : [];
        const sermonsArr = Array.isArray(sermonsData) ? sermonsData : [];
        const builderPages = Array.isArray(builderData?.pages) ? builderData.pages : [];
        const alphaArr = Array.isArray(alphaData) ? alphaData : [];
        const now = new Date();

        setStats({
          redirects: {
            total: redirectsArr.length,
            active: redirectsArr.filter((r: { active: boolean }) => r.active).length,
          },
          sermons: {
            total: sermonsArr.length,
            hidden: sermonsArr.filter((s: { video_id: string }) => s.video_id).length,
          },
          builderPages: {
            total: builderPages.length,
            published: builderPages.filter((p: { status: string }) => p.status === "published").length,
          },
          alphaEvents: {
            total: alphaArr.length,
            upcoming: alphaArr.filter((e: { date: string }) => new Date(e.date) >= now).length,
          },
          banner: {
            active: bannerData.active ?? false,
            type: bannerData.type ?? "announcement",
            message: bannerData.message ?? "",
          },
          popup: {
            active: popupData.active ?? false,
            title: popupData.title ?? "",
          },
        });
      } catch {
        // render without stats
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
          {today}
        </p>
        <h1 className="text-3xl font-black text-destiny-grey">Dashboard</h1>
        <p className="mt-1 text-sm text-destiny-grey/50">
          Overview of your site, content, and tools.
        </p>
      </div>

      {/* Site Status */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
          Site Status
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            icon="campaign"
            label="Banner"
            href="/admin/banner"
            loading={loading}
            active={stats?.banner.active}
            detail={
              stats?.banner.active
                ? stats.banner.message
                  ? stats.banner.message.slice(0, 40) + (stats.banner.message.length > 40 ? "…" : "")
                  : stats.banner.type
                : "Not active"
            }
          />
          <StatusCard
            icon="ad"
            label="Popup"
            href="/admin/popup"
            loading={loading}
            active={stats?.popup.active}
            detail={
              stats?.popup.active
                ? stats.popup.title
                  ? stats.popup.title.slice(0, 40) + (stats.popup.title.length > 40 ? "…" : "")
                  : "Active"
                : "Not active"
            }
          />
          <Link
            href="/admin/cache"
            className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destiny-grey/10 text-destiny-grey">
              <span className="material-symbols-rounded text-xl">refresh</span>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">Cache</p>
              <p className="truncate text-sm font-bold text-destiny-grey">Clear cache</p>
            </div>
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10 text-destiny-orange">
              <span className="material-symbols-rounded text-xl">open_in_new</span>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">Website</p>
              <p className="truncate text-sm font-bold text-destiny-grey">View live site</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
          Content
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="alt_route"
            label="Redirects"
            href="/admin/redirects"
            loading={loading}
            primary={stats?.redirects.active ?? 0}
            primaryLabel="active"
            secondary={stats ? stats.redirects.total - stats.redirects.active : 0}
            secondaryLabel="inactive"
          />
          <StatCard
            icon="play_circle"
            label="Sermons"
            href="/admin/sermons"
            loading={loading}
            primary={stats ? stats.sermons.total - stats.sermons.hidden : 0}
            primaryLabel="videos"
            secondary={stats?.sermons.hidden ?? 0}
            secondaryLabel="hidden"
          />
          <StatCard
            icon="design_services"
            label="Builder Pages"
            href="/admin/builder"
            loading={loading}
            primary={stats?.builderPages.published ?? 0}
            primaryLabel="published"
            secondary={stats ? stats.builderPages.total - stats.builderPages.published : 0}
            secondaryLabel="draft"
          />
          <StatCard
            icon="event"
            label="Courses"
            href="/admin/alpha"
            loading={loading}
            primary={stats?.alphaEvents.upcoming ?? 0}
            primaryLabel="upcoming"
            secondary={stats ? stats.alphaEvents.total - stats.alphaEvents.upcoming : 0}
            secondaryLabel="past"
          />
        </div>
      </section>

      {/* All Sections */}
      <section className="space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
          All Sections
        </h2>

        {/* Standalone top items */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SectionCard
            href="/admin/sermons"
            icon="play_circle"
            label="Sermons"
            description="Hide or show YouTube videos from the public sermons listing."
            color="text-destiny-orange"
            bg="bg-destiny-orange/10"
          />
          <SectionCard
            href="/admin/builder"
            icon="design_services"
            label="Builder"
            description="Create and manage AI-generated and visual drag-drop pages."
            color="text-destiny-orange"
            bg="bg-destiny-orange/10"
          />
          <SectionCard
            href="/admin/redirects"
            icon="alt_route"
            label="Redirects"
            description="Create vanity URLs on destinytees.uk that redirect anywhere."
            color="text-destiny-blue"
            bg="bg-destiny-blue/10"
          />
        </div>

        {/* Announcements group */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-destiny-grey/30">
            Announcements
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SectionCard
              href="/admin/banner"
              icon="campaign"
              label="Banner"
              description="Manage the site-wide announcement or maintenance banner."
              color="text-destiny-blue"
              bg="bg-destiny-blue/10"
            />
            <SectionCard
              href="/admin/popup"
              icon="ad"
              label="Popup"
              description="Configure the modal popup shown to site visitors."
              color="text-destiny-purple"
              bg="bg-destiny-purple/10"
            />
          </div>
        </div>

        {/* Courses group */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-destiny-grey/30">
            Courses
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SectionCard
              href="/admin/alpha"
              icon="event"
              label="Alpha"
              description="Manage Alpha and Youth Alpha events, dates, and sign-up links."
              color="text-destiny-green"
              bg="bg-destiny-green/10"
            />
            <SectionCard
              href="/admin/recovery"
              icon="healing"
              label="Recovery"
              description="Manage Recovery group events and sign-up information."
              color="text-destiny-green"
              bg="bg-destiny-green/10"
            />
          </div>
        </div>

        {/* Tools */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SectionCard
            href="/admin/cache"
            icon="refresh"
            label="Clear Cache"
            description="Manually trigger revalidation of cached pages across the site."
            color="text-destiny-grey"
            bg="bg-destiny-grey/10"
          />
        </div>
      </section>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  href,
  loading,
  active,
  detail,
}: {
  icon: string;
  label: string;
  href: string;
  loading: boolean;
  active?: boolean;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
          active ? "bg-destiny-green/10 text-destiny-green" : "bg-destiny-grey/10 text-destiny-grey/40"
        }`}
      >
        <span className="material-symbols-rounded text-xl">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">{label}</p>
        {loading ? (
          <div className="mt-1 h-3.5 w-20 animate-pulse rounded bg-black/5" />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-destiny-green" : "bg-black/20"}`} />
            <p className="truncate text-sm font-bold text-destiny-grey">{detail}</p>
          </div>
        )}
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  label,
  href,
  loading,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
}: {
  icon: string;
  label: string;
  href: string;
  loading: boolean;
  primary: number;
  primaryLabel: string;
  secondary: number;
  secondaryLabel: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-black/5 bg-white px-5 py-5 shadow-sm transition hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">{label}</p>
        <span className="material-symbols-rounded text-xl text-destiny-grey/20">{icon}</span>
      </div>
      {loading ? (
        <>
          <div className="mb-1.5 h-8 w-16 animate-pulse rounded-lg bg-black/5" />
          <div className="h-3 w-24 animate-pulse rounded bg-black/5" />
        </>
      ) : (
        <>
          <p className="text-3xl font-black text-destiny-grey">{primary}</p>
          <p className="mt-0.5 text-xs text-destiny-grey/40">
            {primaryLabel}
            {secondary > 0 && (
              <span className="ml-2 text-destiny-grey/30">
                · {secondary} {secondaryLabel}
              </span>
            )}
          </p>
        </>
      )}
    </Link>
  );
}

function SectionCard({
  href,
  icon,
  label,
  description,
  color,
  bg,
}: {
  href: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
        <span className="material-symbols-rounded text-xl">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-black text-destiny-grey transition-colors group-hover:text-destiny-orange">
          {label}
        </p>
        <p className="text-xs leading-relaxed text-destiny-grey/50">{description}</p>
      </div>
      <span className="material-symbols-rounded ml-auto mt-0.5 shrink-0 text-base text-destiny-grey/20 transition group-hover:text-destiny-orange/50">
        arrow_forward
      </span>
    </Link>
  );
}
