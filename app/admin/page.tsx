import { cookies } from "next/headers";
import { listSermons } from "@/lib/db";
import { login, logout, runSyncNow, updateSermonTitle } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authed = cookieStore.get("destiny-admin")?.value === "1";

  if (!authed) {
    return <LoginCard />;
  }

  const sermons = await listSermons(25);

  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-destiny-orange/10 via-white to-destiny-blue/10 px-2 py-10 sm:px-4">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="subheading text-sm text-destiny-orange">
              Admin dashboard
            </p>
            <h1 className="text-3xl font-bold text-destiny-black">
              Sermon editor
            </h1>
            <p className="text-sm text-destiny-grey">
              Update titles directly; changes save to Supabase.
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-destiny-orange px-4 py-2 text-sm font-semibold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm sm:px-6">
          <p className="text-sm font-semibold text-destiny-black">
            Sync latest sermons (YouTube + Podcast)
          </p>
          <form action={runSyncNow}>
            <button
              type="submit"
              className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
            >
              Run sync now
            </button>
          </form>
          <p className="text-xs text-destiny-grey/70">
            Pulls last 26 weeks of completed YouTube lives and podcast RSS.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-lg">
          <div className="grid grid-cols-4 gap-4 border-b border-black/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-destiny-grey/70 sm:grid-cols-7 sm:px-6">
            <span className="col-span-2 sm:col-span-4">Title</span>
            <span className="hidden sm:block">YouTube</span>
            <span className="hidden sm:block">Date</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-black/5">
            {sermons.map((sermon) => (
              <form
                key={sermon.id}
                action={updateSermonTitle}
                className="grid grid-cols-4 gap-4 px-4 py-3 sm:grid-cols-7 sm:px-6"
              >
                <input type="hidden" name="id" value={sermon.id} />
                <div className="col-span-2 sm:col-span-4">
                  <input
                    type="text"
                    name="title"
                    defaultValue={sermon.title}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-destiny-black outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                  <p className="mt-1 text-[11px] text-destiny-grey/70">
                    ID: {sermon.id}
                  </p>
                  {sermon.podcastAudioUrl && (
                    <p className="mt-1 text-[11px] text-destiny-grey/70 break-all">
                      Podcast:{" "}
                      <a
                        className="text-destiny-orange underline"
                        href={sermon.podcastAudioUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {sermon.podcastAudioUrl}
                      </a>
                    </p>
                  )}
                </div>
                <div className="hidden items-center text-sm text-destiny-grey sm:flex">
                  <input
                    type="text"
                    name="video"
                    defaultValue={
                      sermon.youtubeVideoId
                        ? `https://www.youtube.com/watch?v=${sermon.youtubeVideoId}`
                        : ""
                    }
                    placeholder="YouTube URL or ID"
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-destiny-black outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
                  />
                </div>
                <div className="hidden items-center text-sm text-destiny-grey sm:flex">
                  {new Date(sermon.date).toLocaleDateString("en-GB")}
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-destiny-orange px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
                  >
                    Save
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginCard() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-destiny-orange/10 via-white to-destiny-blue/10 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white px-8 py-10 shadow-lg">
        <div className="mb-6 space-y-2">
          <p className="subheading text-sm text-destiny-orange">
            Admin login
          </p>
          <h1 className="text-3xl font-bold text-destiny-black">
            Destiny Sermons
          </h1>
          <p className="text-sm text-destiny-grey">
            Enter your credentials to access the admin area.
          </p>
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
