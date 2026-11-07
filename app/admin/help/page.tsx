"use client";

// Help: the admin video series. Every admin can open it (OPEN_PATHS in
// lib/adminRoles.ts). The welcome video is for everyone; below it, the
// how-to videos for the roles this person holds. Super Admins see all of them.
// The list itself lives in lib/adminHelpVideos.ts.

import Link from "next/link";
import { PageHeader, PageLoading } from "@/components/admin/AdminUI";
import MediaEmbed from "@/components/missions/MediaEmbed";
import { useAdminSession } from "@/lib/useAdminSession";
import { PLAYLIST_URL, ROLE_VIDEOS, WELCOME_VIDEO, isPublished, type AdminHelpVideo } from "@/lib/adminHelpVideos";

const CARD =
  "rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800";

function Player({ video }: { video: AdminHelpVideo }) {
  if (video.youtubeId) {
    return (
      <MediaEmbed
        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
        title={video.title}
        thumbnail={video.poster}
      />
    );
  }
  if (video.poster) {
    // Made, not on YouTube yet: the still, marked as coming.
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#f5f7fa]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.poster} alt="" className="h-full w-full object-cover opacity-60" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-sm font-bold text-destiny-grey shadow-sm">
          Video coming soon
        </span>
      </div>
    );
  }
  return null;
}

export default function AdminHelpPage() {
  const session = useAdminSession();
  if (!session.loaded) return <PageLoading label="Loading help" />;

  const su = session.roles.super_admin;
  const mine = ROLE_VIDEOS.filter((v) => su || (v.role !== null && session.roles[v.role]));

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title="Help"
        subtitle="Short videos on how the admin works. Come back here whenever you get stuck."
      />

      <section className={CARD}>
        <Player video={WELCOME_VIDEO} />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-black text-destiny-grey dark:text-white">{WELCOME_VIDEO.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-destiny-grey/70 dark:text-white/60">{WELCOME_VIDEO.description}</p>
          </div>
          {WELCOME_VIDEO.length && (
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-destiny-grey/70 dark:bg-white/10 dark:text-white/60">
              {WELCOME_VIDEO.length}
            </span>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-destiny-grey/50 dark:text-white/40">
          {su ? "Every role" : mine.length === 1 ? "Your role" : "Your roles"}
        </h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-destiny-grey/70 dark:text-white/60">
            Videos for your role will appear here.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {mine.map((v) => (
              <li key={v.id} className={CARD}>
                {isPublished(v) || v.poster ? <Player video={v} /> : null}
                <div className={isPublished(v) || v.poster ? "mt-4" : ""}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-destiny-grey dark:text-white">{v.title}</h3>
                    {!isPublished(v) && (
                      <span className="shrink-0 rounded-full bg-destiny-orange/10 px-2.5 py-1 text-xs font-bold text-destiny-orange">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-destiny-grey/70 dark:text-white/60">{v.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${CARD} mt-10 flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <h2 className="font-black text-destiny-grey dark:text-white">Try it without breaking anything</h2>
          <p className="mt-1 max-w-xl text-sm text-destiny-grey/70 dark:text-white/60">
            The admin tour runs in test mode: you use the real pages, and nothing you do is saved.
          </p>
        </div>
        <Link
          href="/admin?tour=1"
          className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-lg" aria-hidden="true">rocket_launch</span>
          Take the admin tour
        </Link>
      </section>

      <p className="mt-8 text-sm">
        <a href={PLAYLIST_URL} className="font-bold text-destiny-blue hover:underline" target="_blank" rel="noopener noreferrer">
          All the videos on YouTube
        </a>
      </p>

      <p className="mt-3 text-xs text-destiny-grey/50 dark:text-white/40">
        Music: &ldquo;Inspired&rdquo; by Kevin MacLeod (incompetech.com), licensed under{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" className="underline" target="_blank" rel="noopener noreferrer">
          Creative Commons: By Attribution 4.0
        </a>
        .
      </p>
    </div>
  );
}
