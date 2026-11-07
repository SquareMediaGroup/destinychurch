"use client";

// Help: the admin video series. Every admin can open it (OPEN_PATHS in
// lib/adminRoles.ts). The welcome video is for everyone; below it, the
// how-to videos for the roles this person holds (videosFor). Super Admins see all of them.
// The list itself lives in lib/adminHelpVideos.ts.

import Link from "next/link";
import { PageHeader, PageLoading } from "@/components/admin/AdminUI";
import VideoPlayer from "@/components/admin/onboarding/VideoPlayer";
import { useAdminSession } from "@/lib/useAdminSession";
import { PLAYLISTS, WELCOME_VIDEO, isPublished, videosFor } from "@/lib/adminHelpVideos";

const CARD =
  "rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800";

export default function AdminHelpPage() {
  const session = useAdminSession();
  if (!session.loaded) return <PageLoading label="Loading help" />;

  const su = session.roles.super_admin;
  const mine = videosFor(session.roles);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title="Help"
        subtitle="Short videos on how the admin works. Come back here whenever you get stuck."
      />

      <section className={CARD}>
        <VideoPlayer video={WELCOME_VIDEO} />
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
                {isPublished(v) || v.poster ? <VideoPlayer video={v} /> : null}
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
            The sandbox is the real admin with saving switched off: press any button and nothing is
            changed on the website.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin?onboarding=sandbox"
            className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">science</span>
            Open the sandbox
          </Link>
          <Link
            href="/admin?onboarding=welcome"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-5 py-2.5 text-sm font-bold text-destiny-grey/80 transition hover:bg-black/5 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10"
          >
            Go through onboarding again
          </Link>
        </div>
      </section>

      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {PLAYLISTS.map((p) => (
          <a key={p.url} href={p.url} className="font-bold text-destiny-blue hover:underline" target="_blank" rel="noopener noreferrer">
            {p.label}
          </a>
        ))}
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
