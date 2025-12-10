import { cookies } from "next/headers";
import { listSermons } from "@/lib/db";
import { listAdminUsers } from "@/lib/adminUsers";
import {
  addAdminUser,
  clearSermons,
  deleteAdminUserAction,
  deleteSermon,
  login,
  logout,
  runSyncLimited,
  runSyncNow,
  updateSermonMeta,
} from "./actions";
import { cleanDuplicates } from "./cleanup";
import { processSermon } from "./process";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { listReports } from "@/lib/reports";
import PlaylistComposer from "@/components/PlaylistComposer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

type AdminPageProps = {
  searchParams?:
    | Promise<SearchParamsLike | null | undefined>
    | SearchParamsLike
    | null
    | undefined;
};

const getQueryValue = (
  params: SearchParamsLike | null | undefined,
  key: string,
): string => {
  if (!params) return "";
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? "";
  }
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies();
  const authed = cookieStore.get("destiny-admin")?.value === "1";
  const role = cookieStore.get("destiny-admin-role")?.value ?? "admin";
  const isSuper = role === "super";

  const resolvedSearchParams =
    (await Promise.resolve(searchParams)) ?? undefined;
  const syncStatus = getQueryValue(resolvedSearchParams, "sync");
  const syncError = getQueryValue(resolvedSearchParams, "syncError");
  const savedCount = getQueryValue(resolvedSearchParams, "saved");
  const podcastCount = getQueryValue(resolvedSearchParams, "podcast");
  const youtubeCount = getQueryValue(resolvedSearchParams, "youtube");

  if (!authed) return <LoginCard />;

  const [sermons, admins] = await Promise.all([
    listSermons(50),
    isSuper ? listAdminUsers() : Promise.resolve([]),
  ]);

  const reports = await listReports(50);
  const total = sermons.length;
  const withPodcast = sermons.filter((s) => !!s.podcastAudioUrl).length;
  const withSummary = sermons.filter((s) => !!s.summary).length;
  const withTranscript = sermons.filter((s) => !!s.transcript).length;
  const readyPercent = total ? Math.round((withSummary / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8">
        {syncStatus === "ok" && (
          <div className="rounded-xl border border-destiny-green/30 bg-destiny-green/10 px-4 py-3 text-sm text-destiny-grey shadow-sm">
            Sync complete. Saved {savedCount || "items"}. Podcast: {podcastCount || "—"} · YouTube: {youtubeCount || "—"}.
          </div>
        )}
        {syncError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            Sync failed: {syncError}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="subheading text-sm text-destiny-orange">Admin</p>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Destiny dashboard
            </h1>
          </div>
          <form action={logout}>
            <ConfirmSubmit
              className="rounded-full border border-destiny-orange px-4 py-2 text-xs font-semibold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
              confirmMessage="Log out of the admin dashboard?"
              pendingLabel="Logging out..."
            >
              Logout
            </ConfirmSubmit>
          </form>
        </div>
        <StatGrid
          total={total}
          withPodcast={withPodcast}
          withSummary={withSummary}
          withTranscript={withTranscript}
          readyPercent={readyPercent}
          reportCount={reports.length}
        />
        <ActionRow />
        <PlaylistsPanel sermons={sermons} />
        <MaintenanceRow />
        {isSuper && <AdminUsersPanel admins={admins} />}
        <ReportsPanel reports={reports} />
        <SermonTable sermons={sermons} />
      </main>
    </div>
  );
}
function StatGrid({
  total,
  withPodcast,
  withSummary,
  withTranscript,
  readyPercent,
  reportCount,
}: {
  total: number;
  withPodcast: number;
  withSummary: number;
  withTranscript: number;
  readyPercent: number;
  reportCount: number;
}) {
  const cards = [
    { label: "Podcast linked", value: withPodcast, tone: "orange" },
    { label: "Summaries", value: withSummary, tone: "blue" },
    { label: "Transcripts", value: withTranscript, tone: "green" },
    { label: "Total items", value: total, tone: "purple" },
    { label: "AI-ready %", value: `${readyPercent}%`, tone: "orange" },
    { label: "Reports", value: reportCount, tone: "blue" },
  ];
  const toneMap: Record<string, string> = {
    orange: "from-destiny-orange/15 to-[var(--surface)]",
    blue: "from-destiny-blue/15 to-[var(--surface)]",
    green: "from-destiny-green/15 to-[var(--surface)]",
    purple: "from-destiny-purple/15 to-[var(--surface)]",
  };
  const dotMap: Record<string, string> = {
    orange: "bg-destiny-orange",
    blue: "bg-destiny-blue",
    green: "bg-destiny-green",
    purple: "bg-destiny-purple",
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl bg-gradient-to-br ${toneMap[card.tone]} px-4 py-4 shadow-sm ring-1 ring-black/5`}
        >
          <div className="flex items-center justify-between">
            <div className={`h-2 w-2 rounded-full ${dotMap[card.tone]}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
              {card.label}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-destiny-black">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function ActionRow() {
  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-destiny-black">Sync & ingest</p>
          <p className="text-xs text-destiny-grey/80">
            Pull from YouTube + podcast feeds (last 26 weeks).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={runSyncLimited.bind(null, 5)}>
            <ConfirmSubmit
              className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
              confirmMessage="Run sync for the latest 5 items?"
              pendingLabel="Syncing..."
            >
              Sync 5
            </ConfirmSubmit>
          </form>
          <form action={runSyncNow}>
            <ConfirmSubmit
              className="rounded-full border border-destiny-orange px-4 py-2 text-xs font-semibold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
              confirmMessage="Run full sync now?"
              pendingLabel="Syncing..."
            >
              Sync all
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </div>
  );
}

function PlaylistsPanel({ sermons }: { sermons: Awaited<ReturnType<typeof listSermons>> }) {
  const suggestions = sermons.slice(0, 6);

  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-destiny-black">Playlists</p>
          <p className="text-xs text-destiny-grey/80">
            Only admins can create them; they are public and play straight through.
          </p>
        </div>
      </div>

      <form
        action="/api/admin/create-playlist"
        method="post"
        className="mt-4 grid gap-3 md:grid-cols-2"
        aria-label="Create playlist"
      >
        <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
          <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Title</span>
          <input
            type="text"
            name="title"
            placeholder="Summer of Psalms"
            className="w-full rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
            required
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
          <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Slug (optional)</span>
          <input
            type="text"
            name="slug"
            placeholder="summer-psalms"
            className="w-full rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
          />
        </label>
        <div className="md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-destiny-grey/70 mb-1 font-semibold">
            Pick sermons for this playlist
          </p>
          <PlaylistComposer sermons={sermons} />
        </div>
        <label className="md:col-span-2 space-y-1 text-sm font-semibold text-[var(--foreground)]">
          <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Description</span>
          <textarea
            name="description"
            rows={3}
            placeholder="All messages from the Romans series."
            className="w-full rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
          />
        </label>
        <div className="md:col-span-2 flex justify-end">
          <ConfirmSubmit
            className="rounded-full bg-destiny-blue px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
            confirmMessage="Create this public playlist?"
            pendingLabel="Creating..."
          >
            Create playlist
          </ConfirmSubmit>
        </div>
      </form>

      <div className="mt-4 rounded-xl border border-black/5 bg-destiny-blue/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-destiny-grey/70">
          Recent sermon identifiers
        </p>
        {suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-destiny-grey">No sermons yet. Sync first.</p>
        ) : (
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {suggestions.map((sermon) => (
              <div key={sermon.id} className="rounded-lg border border-black/5 bg-white px-3 py-2 text-xs text-destiny-grey">
                <p className="font-semibold text-destiny-black line-clamp-1">{sermon.title}</p>
                <p className="truncate">ID: {sermon.id}</p>
                <p className="truncate">
                  YouTube: {sermon.youtubeVideoId || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MaintenanceRow() {
  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-destiny-black">Maintenance</p>
          <p className="text-xs text-destiny-grey/80">
            Clean duplicates or clear all sermons (Supabase).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={cleanDuplicates}>
            <ConfirmSubmit
              className="rounded-full bg-destiny-blue px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
              confirmMessage="Delete duplicates (keeps first per YouTube ID / podcast GUID)?"
              pendingLabel="Cleaning..."
            >
              Clean duplicates
            </ConfirmSubmit>
          </form>
          <form action={clearSermons}>
            <ConfirmSubmit
              className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500 hover:text-white"
              confirmMessage="Delete ALL sermons from Supabase?"
              pendingLabel="Deleting..."
            >
              Clear all
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </div>
  );
}

function AdminUsersPanel({ admins }: { admins: { username: string; createdAt?: string }[] }) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-destiny-black">Admin users</p>
          <p className="text-xs text-destiny-grey/80">Super admin can add/remove users.</p>
        </div>
        <form action={addAdminUser} className="flex flex-wrap gap-2">
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
            required
          />
          <ConfirmSubmit
            className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
            confirmMessage="Add this admin user?"
            pendingLabel="Saving..."
          >
            Add user
          </ConfirmSubmit>
        </form>
      </div>

      <div className="mt-4 divide-y divide-black/5 rounded-xl border border-black/5 bg-destiny-blue/5">
        {admins.map((admin) => (
          <div
            key={admin.username}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-destiny-black">{admin.username}</p>
              <p className="text-xs text-destiny-grey/70">
                Added {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-GB") : "—"}
              </p>
            </div>
            <form action={deleteAdminUserAction}>
              <input type="hidden" name="username" value={admin.username} />
              <ConfirmSubmit
                className="rounded-full border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-500 hover:text-white"
                confirmMessage="Remove this admin user?"
                pendingLabel="Removing..."
              >
                Remove
              </ConfirmSubmit>
            </form>
          </div>
        ))}
        {admins.length === 0 && (
          <div className="px-4 py-3 text-sm text-destiny-grey">No additional admins yet.</div>
        )}
      </div>
    </div>
  );
}

function SermonTable({ sermons }: { sermons: Awaited<ReturnType<typeof listSermons>> }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-destiny-black">Sermons</p>
          <p className="text-xs text-destiny-grey/70">
            Edit titles, links, or run AI per item.
          </p>
        </div>
      </div>
      <div className="divide-y divide-black/5">
        {sermons.map((sermon) => (
          <div key={sermon.id} className="bg-[var(--surface-muted)] px-4 py-5">
            <div className="grid gap-4 md:grid-cols-[1.6fr_1fr] md:items-start">
              <form
                id={`edit-${sermon.id}`}
                action={updateSermonMeta}
                className="space-y-3"
                aria-label={`Edit ${sermon.title}`}
              >
                <input type="hidden" name="id" value={sermon.id} />
                <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
                  <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Title</span>
                  <input
                    type="text"
                    name="title"
                    defaultValue={sermon.title}
                    className="w-full rounded-xl border border-black/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                </label>
                <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
                  <span className="text-xs uppercase tracking-wide text-destiny-grey/70">Podcast link or GUID</span>
                  <input
                    type="text"
                    name="podcast"
                    defaultValue={sermon.podcastAudioUrl || sermon.podcastGuid || ""}
                    placeholder="Podcast link or GUID (leave empty to unlink)"
                    className="w-full rounded-xl border border-black/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                </label>
                <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
                  <span className="text-xs uppercase tracking-wide text-destiny-grey/70">YouTube URL or ID</span>
                  <input
                    type="text"
                    name="video"
                    defaultValue={
                      sermon.youtubeVideoId ? `https://www.youtube.com/watch?v=${sermon.youtubeVideoId}` : ""
                    }
                    placeholder="YouTube URL or ID"
                    className="w-full rounded-xl border border-black/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-destiny-grey/70">
                  <span>ID: {sermon.id}</span>
                </div>
              </form>
              <div className="space-y-2 rounded-xl bg-destiny-blue/5 p-3 text-sm text-destiny-grey">
                <InfoRow label="YouTube" value={sermon.youtubeVideoId || "—"} />
                <InfoRow label="Podcast" value={sermon.podcastGuid || sermon.podcastAudioUrl || "—"} />
                <InfoRow
                  label="AI"
                  value={
                    sermon.summary
                      ? sermon.transcript
                        ? "Summary + transcript"
                        : "Summary only"
                      : "Not processed"
                  }
                />
                <InfoRow
                  label="Date"
                  value={sermon.date ? new Date(sermon.date).toLocaleDateString("en-GB") : "—"}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={processSermon}>
                <input type="hidden" name="id" value={sermon.id} />
                <ConfirmSubmit
                  className="rounded-full border border-destiny-orange px-4 py-2 text-xs font-semibold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
                  confirmMessage="Run AI transcript and summary for this sermon? Uses OpenAI API."
                  pendingLabel="Processing..."
                >
                  Process AI
                </ConfirmSubmit>
              </form>
              <form action={deleteSermon}>
                <input type="hidden" name="id" value={sermon.id} />
                <ConfirmSubmit
                  className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500 hover:text-white"
                  confirmMessage="Delete this sermon? This cannot be undone."
                  pendingLabel="Deleting..."
                >
                  Delete
                </ConfirmSubmit>
              </form>
              <ConfirmSubmit
                form={`edit-${sermon.id}`}
                className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
                confirmMessage="Save updates to this sermon?"
                pendingLabel="Saving..."
              >
                Save
              </ConfirmSubmit>
            </div>
          </div>
        ))}
        {sermons.length === 0 && (
          <div className="px-4 py-6 text-sm text-destiny-grey">No sermons yet. Run a sync to begin.</div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-destiny-black/80">{label}</span>
      <span className="truncate text-xs text-destiny-grey">{value}</span>
    </div>
  );
}

function ReportsPanel({ reports }: { reports: Awaited<ReturnType<typeof listReports>> }) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-destiny-black">Reports</p>
          <p className="text-xs text-destiny-grey/70">Issues with AI summary or transcript.</p>
        </div>
        <span className="rounded-full bg-destiny-orange/10 px-3 py-1 text-xs font-semibold text-destiny-orange">
          {reports.length} new
        </span>
      </div>

      {reports.length === 0 ? (
        <p className="mt-4 text-sm text-destiny-grey">No reports yet.</p>
      ) : (
        <div className="mt-4 divide-y divide-black/5">
          {reports.map((report) => (
            <div key={report.id} className="py-3 text-sm text-destiny-grey">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-destiny-black">
                  {report.issueType} · {report.name}
                </p>
                <span className="text-xs text-destiny-grey/70">
                  {report.createdAt
                    ? new Date(report.createdAt).toLocaleString("en-GB")
                    : ""}
                </span>
              </div>
              <p className="text-xs text-destiny-grey/70">{report.email}</p>
              {report.sermonId && (
                <p className="text-xs text-destiny-grey/70">Sermon: {report.sermonId}</p>
              )}
              <p className="mt-2 leading-relaxed text-[var(--foreground)]">{report.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginCard() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-8 py-10 shadow-lg">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm font-semibold text-destiny-orange">Admin login</p>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Destiny Sermons</h1>
          <p className="text-sm text-destiny-grey">
            Sign in to manage sermons, sync, and AI processing.
          </p>
        </div>

        <form className="space-y-4" action={login}>
          <label className="block space-y-2 text-sm font-semibold text-[var(--foreground)]">
            <span className="text-sm">Username</span>
            <input
              type="text"
              name="username"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)] shadow-inner outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
              required
              autoComplete="username"
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold text-[var(--foreground)]">
            <span className="text-sm">Password</span>
            <input
              type="password"
              name="password"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)] shadow-inner outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
              required
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-destiny-orange px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
