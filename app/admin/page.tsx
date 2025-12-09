import { cookies } from "next/headers";
import { listSermons } from "@/lib/db";
import { listAdminUsers } from "@/lib/adminUsers";
import {
  addAdminUser,
  clearSermons,
  deleteAdminUserAction,
  deleteSermon,
  login,
  runSyncLimited,
  runSyncNow,
  updateSermonMeta,
} from "./actions";
import { cleanDuplicates } from "./cleanup";
import { processSermon } from "./process";
import ConfirmSubmit from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authed = cookieStore.get("destiny-admin")?.value === "1";
  const role = cookieStore.get("destiny-admin-role")?.value ?? "admin";
  const isSuper = role === "super";

  if (!authed) return <LoginCard />;

  const [sermons, admins] = await Promise.all([
    listSermons(50),
    isSuper ? listAdminUsers() : Promise.resolve([]),
  ]);

  const total = sermons.length;
  const withPodcast = sermons.filter((s) => !!s.podcastAudioUrl).length;
  const withSummary = sermons.filter((s) => !!s.summary).length;
  const withTranscript = sermons.filter((s) => !!s.transcript).length;
  const readyPercent = total ? Math.round((withSummary / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8">
        <StatGrid
          total={total}
          withPodcast={withPodcast}
          withSummary={withSummary}
          withTranscript={withTranscript}
          readyPercent={readyPercent}
        />
        <ActionRow />
        <MaintenanceRow />
        {isSuper && <AdminUsersPanel admins={admins} />}
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
}: {
  total: number;
  withPodcast: number;
  withSummary: number;
  withTranscript: number;
  readyPercent: number;
}) {
  const cards = [
    { label: "Podcast linked", value: withPodcast, tone: "orange" },
    { label: "Summaries", value: withSummary, tone: "blue" },
    { label: "Transcripts", value: withTranscript, tone: "green" },
    { label: "Total items", value: total, tone: "purple" },
    { label: "AI-ready %", value: `${readyPercent}%`, tone: "orange" },
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
          <div key={sermon.id} className="bg-[var(--surface-muted)] px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr] md:items-center">
              <div className="space-y-3">
                <form action={updateSermonMeta} className="space-y-2">
                  <input type="hidden" name="id" value={sermon.id} />
                  <input
                    type="text"
                    name="title"
                    defaultValue={sermon.title}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                  <input
                    type="text"
                    name="podcast"
                    defaultValue={sermon.podcastAudioUrl || sermon.podcastGuid || ""}
                    placeholder="Podcast link or GUID (leave empty to unlink)"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                  <input
                    type="text"
                    name="video"
                    defaultValue={
                      sermon.youtubeVideoId ? `https://www.youtube.com/watch?v=${sermon.youtubeVideoId}` : ""
                    }
                    placeholder="YouTube URL or ID"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                  <p className="text-[11px] text-destiny-grey/70">ID: {sermon.id}</p>
                  <ConfirmSubmit
                    className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
                    confirmMessage="Save updates to this sermon?"
                    pendingLabel="Saving..."
                  >
                    Save
                  </ConfirmSubmit>
                </form>
                <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
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
