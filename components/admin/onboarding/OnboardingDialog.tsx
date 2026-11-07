"use client";

// The modal half of onboarding: Welcome, Videos and Finish. (The Sandbox is not
// a modal - it is the admin itself, with SandboxBar across the top.)
//
// All three share one shell and one stepper. The stepper is also navigation:
// every stage can be reached from every other, because "at any point you can do
// 2, 3 and 4 again" is the promise, and a wizard that only moves forward breaks
// it.
//
// Closing is a real answer. Escape, the close button and "Skip for now" all mean
// "not now", and none of them trap anyone: the Get Started launcher stays until
// they press Finish.

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useHydrated } from "@/lib/useHydrated";
import { useScrollLock } from "@/lib/useScrollLock";
import { STAGES, ROLE_ICONS, heldRoles, type OnboardingStage } from "@/lib/adminOnboarding";
import { WELCOME_VIDEO, isPublished, videosFor, type AdminHelpVideo } from "@/lib/adminHelpVideos";
import { roleLabel, type RoleFlags } from "@/lib/adminRoles";
import VideoPlayer from "./VideoPlayer";

const PRIMARY =
  "inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110";
const SECONDARY =
  "inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/20";
const QUIET =
  "rounded-xl px-4 py-3 text-sm font-bold text-white/55 transition hover:bg-white/10 hover:text-white";

export default function OnboardingDialog({
  stage,
  roles,
  previewing,
  onGo,
  onClose,
  onFinish,
}: {
  stage: Exclude<OnboardingStage, "sandbox">;
  /** The roles being shown: the preview role's flags while a super admin previews. */
  roles: RoleFlags;
  /** A super admin looking at someone else's onboarding: nothing is recorded. */
  previewing: boolean;
  onGo: (stage: OnboardingStage) => void;
  onClose: () => void;
  onFinish: () => void;
}) {
  const mounted = useHydrated();
  const panelRef = useRef<HTMLDivElement>(null);

  useScrollLock(true);
  useFocusTrap(panelRef, mounted, onClose);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <BorderBeam size="pulse-inner" borderRadius={24} strength={1} className="relative my-auto w-full max-w-2xl rounded-3xl">
        <div className="glass admin-glass absolute inset-0 rounded-3xl" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className="relative p-6 sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <Stepper stage={stage} onGo={onGo} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close onboarding"
              className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <span className="material-symbols-rounded text-xl" aria-hidden="true">close</span>
            </button>
          </div>

          {stage === "welcome" && <Welcome roles={roles} onGo={onGo} onClose={onClose} />}
          {stage === "videos" && <Videos roles={roles} onGo={onGo} />}
          {stage === "finish" && <Finish previewing={previewing} onGo={onGo} onFinish={onFinish} />}
        </div>
      </BorderBeam>
    </div>,
    document.body,
  );
}

function Stepper({ stage, onGo }: { stage: OnboardingStage; onGo: (s: OnboardingStage) => void }) {
  const current = STAGES.findIndex((s) => s.id === stage);
  return (
    <nav aria-label="Onboarding steps">
      <ol className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((s, i) => {
          const active = i === current;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onGo(s.id)}
                aria-current={active ? "step" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active ? "bg-destiny-orange text-white" : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
                }`}
              >
                <span className="tabular-nums">{i + 1}</span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Welcome({
  roles,
  onGo,
  onClose,
}: {
  roles: RoleFlags;
  onGo: (s: OnboardingStage) => void;
  onClose: () => void;
}) {
  const held = heldRoles(roles);
  return (
    <>
      <h1 id="onboarding-title" className="mt-6 text-2xl font-black leading-tight text-white">
        Welcome to Destiny Admin
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        This is where the website is looked after. You only see the parts you&rsquo;ve been given
        access to, so if something is missing, it belongs to someone else.
      </p>

      <div className="mt-5 rounded-2xl bg-white/8 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-white/45">Your access</p>
        {roles.super_admin ? (
          <p className="mt-1 text-sm font-bold text-white">Super Admin: every part of the admin</p>
        ) : held.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {held.map((role) => (
              <li
                key={role}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white"
              >
                <span className="material-symbols-rounded text-base text-destiny-orange" aria-hidden="true">
                  {ROLE_ICONS[role]}
                </span>
                {roleLabel(role)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-white/70">No access levels yet. Ask a Super Admin.</p>
        )}
      </div>

      <ol className="mt-5 space-y-2 text-sm text-white/70">
        <li>
          <strong className="text-white">Watch</strong> a short video for each part you look after.
        </li>
        <li>
          <strong className="text-white">Try it</strong> in the sandbox: the real pages, with nothing saved.
        </li>
        <li>
          <strong className="text-white">Finish</strong> when you&rsquo;re ready. You can repeat any of it later.
        </li>
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onGo("videos")} className={PRIMARY}>
          Get started
          <span className="material-symbols-rounded text-lg" aria-hidden="true">arrow_forward</span>
        </button>
        <button type="button" onClick={onClose} className={QUIET}>
          Skip for now
        </button>
      </div>
      <p className="mt-4 text-xs text-white/45">
        Skipping keeps a Get Started checklist in the corner, so you can pick it up whenever suits.
      </p>
    </>
  );
}

function Videos({ roles, onGo }: { roles: RoleFlags; onGo: (s: OnboardingStage) => void }) {
  const list: AdminHelpVideo[] = [WELCOME_VIDEO, ...videosFor(roles)];
  const [openId, setOpenId] = useState(list[0].id);

  return (
    <>
      <h1 id="onboarding-title" className="mt-6 text-2xl font-black leading-tight text-white">
        {list.length > 2 ? "Your videos" : "Your video"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Start with the welcome video, then one for each part of the admin you look after. Each is a
        few minutes. They live on the Help page too.
      </p>

      <ul className="mt-5 space-y-2">
        {list.map((video) => {
          const open = openId === video.id && (isPublished(video) || Boolean(video.poster));
          const playable = isPublished(video);
          return (
            <li key={video.id} className="overflow-hidden rounded-2xl bg-white/8">
              <button
                type="button"
                onClick={() => setOpenId(open ? "" : video.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/8"
              >
                <span className="material-symbols-rounded text-xl text-destiny-orange" aria-hidden="true">
                  {playable ? "play_circle" : "schedule"}
                </span>
                <span className="min-w-0 flex-1 text-sm font-bold text-white">{video.title}</span>
                {playable ? (
                  video.length && <span className="shrink-0 text-xs font-bold text-white/55">{video.length}</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-destiny-orange/20 px-2.5 py-1 text-[11px] font-bold text-destiny-orange">
                    Coming soon
                  </span>
                )}
              </button>
              {open && (
                <div className="px-4 pb-4">
                  <VideoPlayer video={video} />
                  <p className="mt-3 text-xs leading-relaxed text-white/60">{video.description}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onGo("sandbox")} className={PRIMARY}>
          Try it in the sandbox
          <span className="material-symbols-rounded text-lg" aria-hidden="true">arrow_forward</span>
        </button>
        <button type="button" onClick={() => onGo("welcome")} className={QUIET}>
          Back
        </button>
      </div>
    </>
  );
}

function Finish({
  previewing,
  onGo,
  onFinish,
}: {
  previewing: boolean;
  onGo: (s: OnboardingStage) => void;
  onFinish: () => void;
}) {
  return (
    <>
      <h1 id="onboarding-title" className="mt-6 text-2xl font-black leading-tight text-white">
        Finish when you&rsquo;re ready
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Anything you made in the sandbox was practice and has gone: nothing was created or changed on
        the website. Not feeling sure yet? Go round again. You can come back to the videos and the
        sandbox whenever you like, from the Help page or by pressing Command-K and searching for
        &ldquo;onboarding&rdquo;.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onFinish} className={PRIMARY}>
          {previewing ? "Close preview" : "Finish"}
          <span className="material-symbols-rounded text-lg" aria-hidden="true">check</span>
        </button>
        <button type="button" onClick={() => onGo("videos")} className={SECONDARY}>
          <span className="material-symbols-rounded text-lg" aria-hidden="true">play_circle</span>
          Watch the videos again
        </button>
        <button type="button" onClick={() => onGo("sandbox")} className={SECONDARY}>
          <span className="material-symbols-rounded text-lg" aria-hidden="true">science</span>
          Back to the sandbox
        </button>
      </div>
    </>
  );
}
