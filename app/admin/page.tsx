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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const navItems = [
  { label: "Dashboard", icon: "📊" },
  { label: "Sermons", icon: "🎥" },
  { label: "AI", icon: "✨" },
  { label: "Users", icon: "👥" },
  { label: "Settings", icon: "⚙️" },
];

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
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/30 to-destiny-blue/5 text-destiny-black">
      <div className="grid min-h-screen gap-4 lg:grid-cols-[250px_1fr]">
        <Sidebar isSuper={isSuper} />

        <main className="px-4 py-6 lg:pr-8">
          <TopBar />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.8fr_1fr]">
            <div className="space-y-4">
              <HeroPanel total={total} readyPercent={readyPercent} />
              <StatGrid
                total={total}
                withPodcast={withPodcast}
                withSummary={withSummary}
                withTranscript={withTranscript}
              />
              <ActionRow />
              <MaintenanceRow />
              {isSuper && <AdminUsersPanel admins={admins} />}
              <SermonTable sermons={sermons} />
            </div>

            <aside className="space-y-4">
              <ProfileCard isSuper={isSuper} />
              <QuickSync />
              <LegendCard />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ isSuper }: { isSuper: boolean }) {
  return (
    <aside className="hidden min-h-screen bg-white/90 shadow-sm ring-1 ring-black/5 lg:block">
      <div className="flex h-full flex-col space-y-6 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destiny-orange text-white font-bold">
            DC
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-destiny-grey/70">
              Destiny Sermons
            </p>
            <p className="text-lg font-semibold text-destiny-black">Admin</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-destiny-grey hover:bg-destiny-orange/10 hover:text-destiny-black"
            >
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          {isSuper && (
            <p className="text-xs font-semibold uppercase tracking-wide text-destiny-orange">
              Super admin
            </p>
          )}
          <form action={logout}>
            <ConfirmSubmit
              className="w-full rounded-xl border border-destiny-grey/20 px-3 py-3 text-sm font-semibold text-destiny-grey transition hover:border-destiny-orange hover:bg-destiny-orange/10 hover:text-destiny-black"
              confirmMessage="Log out of the admin dashboard?"
              pendingLabel="Logging out..."
            >
              Logout
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-1 items-center gap-3 rounded-xl border border-black/5 px-3 py-2 text-sm text-destiny-grey">
        <span className="text-lg">🔍</span>
        <input
          className="w-full border-none bg-transparent outline-none"
          placeholder="Search sermons, podcasts, tags"
        />
      </div>
      <div className="hidden items-center gap-2 text-sm font-semibold text-destiny-grey lg:flex">
        <span className="rounded-full bg-destiny-orange/10 px-3 py-1 text-destiny-orange">
          Live
        </span>
        <span className="rounded-full bg-destiny-blue/10 px-3 py-1 text-destiny-blue">
          AI
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-destiny-orange/10 text-center text-sm font-bold text-destiny-orange leading-10">
          DC
        </div>
      </div>
    </div>
  );
}

function HeroPanel({ total, readyPercent }: { total: number; readyPercent: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-destiny-grey to-black text-white shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">Destiny Church</p>
          <h1 className="text-2xl font-bold">Sermons control centre</h1>
          <p className="text-sm text-white/80">Streamlined syncing, AI processing, and metadata.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center shadow-inner backdrop-blur">
            <p className="text-sm text-white/80">Total sermons</p>
            <p className="text-3xl font-bold">{total}</p>
          </div>
          <div className="rounded-xl bg-destiny-orange px-4 py-3 text-center shadow-inner">
            <p className="text-sm text-white/90">AI-ready</p>
            <p className="text-3xl font-bold">{readyPercent}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatGrid({
  total,
  withPodcast,
  withSummary,
  withTranscript,
}: {
  total: number;
  withPodcast: number;
  withSummary: number;
  withTranscript: number;
}) {
  const cards = [
    { label: "Podcast linked", value: withPodcast, tone: "orange" },
    { label: "Summaries", value: withSummary, tone: "blue" },
    { label: "Transcripts", value: withTranscript, tone: "green" },
    { label: "Total items", value: total, tone: "purple" },
  ];
  const toneMap: Record<string, string> = {
    orange: "from-destiny-orange/15 to-white",
    blue: "from-destiny-blue/15 to-white",
    green: "from-destiny-green/15 to-white",
    purple: "from-destiny-purple/15 to-white",
  };
  const dotMap: Record<string, string> = {
    orange: "bg-destiny-orange",
    blue: "bg-destiny-blue",
    green: "bg-destiny-green",
    purple: "bg-destiny-purple",
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5">
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
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5">
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

function QuickSync() {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-semibold text-destiny-black">Quick actions</p>
      <div className="mt-3 space-y-2 text-sm">
        <p className="flex items-center gap-2 text-destiny-grey">
          <span className="text-lg">⚡</span> Sync 5 to test
        </p>
        <p className="flex items-center gap-2 text-destiny-grey">
          <span className="text-lg">🧠</span> Run AI per sermon (Process AI)
        </p>
        <p className="flex items-center gap-2 text-destiny-grey">
          <span className="text-lg">🧹</span> Clean duplicates if you see doubles
        </p>
      </div>
    </div>
  );
}

function ProfileCard({ isSuper }: { isSuper: boolean }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-destiny-orange to-destiny-red/80 px-5 py-5 text-white shadow-md">
      <p className="text-sm font-semibold">Signed in</p>
      <p className="text-2xl font-bold">Admin</p>
      <p className="text-sm text-white/80">
        Role: {isSuper ? "Super admin (can manage users)" : "Admin"}
      </p>
      <form action={logout} className="mt-4">
        <ConfirmSubmit
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-destiny-orange shadow-sm transition hover:brightness-95"
          confirmMessage="Log out of the admin dashboard?"
          pendingLabel="Logging out..."
        >
          Logout
        </ConfirmSubmit>
      </form>
    </div>
  );
}

function LegendCard() {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 text-sm text-destiny-grey">
      <p className="text-sm font-semibold text-destiny-black">Legend</p>
      <ul className="mt-2 space-y-1">
        <li>• Save — update title / links</li>
        <li>• Process AI — transcribe + summarise</li>
        <li>• Delete — remove sermon row</li>
      </ul>
    </div>
  );
}

function AdminUsersPanel({ admins }: { admins: { username: string; createdAt?: string }[] }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5">
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
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
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
          <div key={sermon.id} className="bg-white/60 px-4 py-4">
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
    <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-destiny-orange/10 via-white to-destiny-blue/10 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white px-8 py-10 shadow-lg">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-semibold text-destiny-orange">Admin login</p>
          <h1 className="text-3xl font-bold text-destiny-black">Destiny Sermons</h1>
          <p className="text-sm text-destiny-grey">Super admin is the ENV admin user; super can add others.</p>
        </div>

        <form className="space-y-4" action={login}>
          <label className="block space-y-1 text-sm font-semibold text-destiny-black">
            Username
            <input
              type="text"
              name="username"
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-destiny-grey shadow-inner outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
              required
              autoComplete="username"
            />
          </label>

          <label className="block space-y-1 text-sm font-semibold text-destiny-black">
            Password
            <input
              type="password"
              name="password"
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-destiny-grey shadow-inner outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
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
