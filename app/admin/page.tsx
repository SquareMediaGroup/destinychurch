"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  redirects: { total: number; active: number };
  alphaEvents: { total: number; upcoming: number };
  banner: { active: boolean; type: string; message: string };
  popup: { active: boolean; title: string };
  shop: { totalProducts: number; totalStock: number; soldThisYearPennies: number };
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [redirectsRes, alphaRes, bannerRes, popupRes, productsRes, ordersRes] =
          await Promise.allSettled([
            fetch("/api/admin/redirects"),
            fetch("/api/admin/alpha-events"),
            fetch("/api/admin/banner"),
            fetch("/api/admin/popup"),
            fetch("/api/admin/store/products"),
            fetch("/api/admin/store/orders"),
          ]);

        const redirectsData =
          redirectsRes.status === "fulfilled" && redirectsRes.value.ok
            ? await redirectsRes.value.json()
            : [];
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
        const productsData =
          productsRes.status === "fulfilled" && productsRes.value.ok
            ? await productsRes.value.json()
            : [];
        const ordersData =
          ordersRes.status === "fulfilled" && ordersRes.value.ok
            ? await ordersRes.value.json()
            : [];

        const redirectsArr = Array.isArray(redirectsData) ? redirectsData : [];
        const alphaArr = Array.isArray(alphaData) ? alphaData : [];
        const productsArr = Array.isArray(productsData) ? productsData : [];
        const ordersArr = Array.isArray(ordersData) ? ordersData : [];
        const now = new Date();
        const currentYear = now.getFullYear();

        const totalStock = productsArr.reduce(
          (sum: number, p: { variants?: { stock?: number }[] }) =>
            sum + (p.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0),
          0,
        );

        const soldThisYearPennies = ordersArr
          .filter((o: { status: string; paid_at: string | null; created_at: string }) => {
            if (o.status !== "paid" && o.status !== "fulfilled") return false;
            const date = new Date(o.paid_at ?? o.created_at);
            return date.getFullYear() === currentYear;
          })
          .reduce((sum: number, o: { total_pennies: number | null }) => sum + (o.total_pennies ?? 0), 0);

        setStats({
          redirects: {
            total: redirectsArr.length,
            active: redirectsArr.filter((r: { active: boolean }) => r.active).length,
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
          shop: {
            totalProducts: productsArr.length,
            totalStock,
            soldThisYearPennies,
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
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
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

      {/* Overview metrics */}
      <section className="mb-10">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            href="/admin/redirects"
            icon="alt_route"
            iconColor="text-destiny-blue"
            iconBg="bg-destiny-blue/10"
            label="Redirects"
            loading={loading}
            value={stats?.redirects.active ?? 0}
            chip={
              stats
                ? { text: `${stats.redirects.total} total`, tone: "muted" }
                : undefined
            }
          />
          <MetricCard
            href="/admin/alpha"
            icon="event"
            iconColor="text-destiny-green"
            iconBg="bg-destiny-green/10"
            label="Upcoming courses"
            loading={loading}
            value={stats?.alphaEvents.upcoming ?? 0}
            chip={
              stats
                ? { text: `${stats.alphaEvents.total} total`, tone: "muted" }
                : undefined
            }
          />
          <MetricCard
            href="/admin/banner"
            icon="campaign"
            iconColor={stats?.banner.active ? "text-destiny-orange" : "text-destiny-grey/40"}
            iconBg={stats?.banner.active ? "bg-destiny-orange/10" : "bg-destiny-grey/10"}
            label="Banner"
            loading={loading}
            value={stats?.banner.active ? "Active" : "Off"}
            valueClass={stats?.banner.active ? "text-destiny-grey" : "text-destiny-grey/40"}
            chip={{
              text: stats?.banner.active ? "Live" : "Hidden",
              tone: stats?.banner.active ? "active" : "muted",
            }}
          />
          <MetricCard
            href="/admin/popup"
            icon="ad"
            iconColor={stats?.popup.active ? "text-destiny-purple" : "text-destiny-grey/40"}
            iconBg={stats?.popup.active ? "bg-destiny-purple/10" : "bg-destiny-grey/10"}
            label="Popup"
            loading={loading}
            value={stats?.popup.active ? "Active" : "Off"}
            valueClass={stats?.popup.active ? "text-destiny-grey" : "text-destiny-grey/40"}
            chip={{
              text: stats?.popup.active ? "Live" : "Hidden",
              tone: stats?.popup.active ? "active" : "muted",
            }}
          />
        </div>
      </section>

      {/* Shop */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
          Shop
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            href="/admin/store"
            icon="inventory_2"
            iconColor="text-destiny-orange"
            iconBg="bg-destiny-orange/10"
            label="Total products"
            loading={loading}
            value={stats?.shop.totalProducts ?? 0}
          />
          <MetricCard
            href="/admin/store"
            icon="package_2"
            iconColor="text-destiny-blue"
            iconBg="bg-destiny-blue/10"
            label="Units in stock"
            loading={loading}
            value={stats?.shop.totalStock ?? 0}
          />
          <MetricCard
            href="/admin/store/orders"
            icon="payments"
            iconColor="text-destiny-green"
            iconBg="bg-destiny-green/10"
            label={`Sold in ${new Date().getFullYear()}`}
            loading={loading}
            value={stats ? gbp.format(stats.shop.soldThisYearPennies / 100) : "£0"}
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey shadow-sm transition hover:shadow-md"
          >
            <span className="material-symbols-rounded text-lg text-destiny-orange">open_in_new</span>
            View live site
          </Link>
        </div>
      </section>

      {/* All Sections */}
      <section className="space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
          Manage
        </h2>

        {/* Standalone top items */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SectionCard
            href="/admin/redirects"
            icon="alt_route"
            label="Redirects"
            description="Create vanity URLs on destinytees.uk that redirect anywhere."
            color="text-destiny-blue"
            bg="bg-destiny-blue/10"
          />
        </div>

        {/* Courses group */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-destiny-grey/30">
            Courses
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SectionCard
              href="/admin/featured-course"
              icon="stars"
              label="Featured (What's On)"
              description="Choose which course headlines the What's On page."
              color="text-destiny-orange"
              bg="bg-destiny-orange/10"
            />
            <SectionCard
              href="/admin/bible-course"
              icon="menu_book"
              label="The Bible Course"
              description="Manage The Bible Course events, dates, and sign-up links."
              color="text-destiny-blue"
              bg="bg-destiny-blue/10"
            />
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
      </section>
    </div>
  );
}

function MetricCard({
  href,
  icon,
  iconColor,
  iconBg,
  label,
  loading,
  value,
  valueClass = "text-destiny-grey",
  chip,
}: {
  href: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  loading: boolean;
  value: number | string;
  valueClass?: string;
  chip?: { text: string; tone: "up" | "down" | "active" | "muted" };
}) {
  const chipTone =
    chip?.tone === "active"
      ? "bg-destiny-green/10 text-destiny-green"
      : chip?.tone === "up"
        ? "bg-destiny-green/10 text-destiny-green"
        : chip?.tone === "down"
          ? "bg-destiny-red/10 text-destiny-red"
          : "bg-black/5 text-destiny-grey/50";

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
      >
        <span className="material-symbols-rounded text-2xl">{icon}</span>
      </span>

      <div className="mt-5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {loading ? (
            <>
              <div className="mb-1.5 h-8 w-16 animate-pulse rounded-lg bg-black/5" />
              <div className="h-3 w-20 animate-pulse rounded bg-black/5" />
            </>
          ) : (
            <>
              <p className={`text-3xl font-black leading-none ${valueClass}`}>{value}</p>
              <p className="mt-1.5 truncate text-sm font-medium text-destiny-grey/50">
                {label}
              </p>
            </>
          )}
        </div>
        {!loading && chip && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${chipTone}`}
          >
            {chip.text}
          </span>
        )}
      </div>
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
