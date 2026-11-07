// Admin onboarding, in one place.
//
// Onboarding is four stages, and a person can go back to any of the last three
// whenever they like:
//
//   1. Welcome   - who you are in the admin and what you've been given
//   2. Videos    - the welcome video, then one how-to per role you hold
//   3. Sandbox   - the real admin pages with every save switched off
//                  (lib/demoMode.ts), so you can try what the videos showed
//   4. Finish    - tell us you're ready; the Get Started launcher goes away
//
// The videos themselves are listed in lib/adminHelpVideos.ts. There is no guided
// tour any more: a spotlight that walks you through one fixed path is a worse
// way to learn than the video plus a free run at the real pages.
//
// Progress is three ticks (videos, sandbox, finish) stored in
// admin_onboarding.completed_steps. Older rows also hold the ids of retired tour
// sections; nothing reads them and they are harmless.

import { ADMIN_ROLES, type AdminRole, type RoleFlags } from "./adminRoles";

export type OnboardingStage = "welcome" | "videos" | "sandbox" | "finish";

/** The stages in the order a person meets them. */
export const STAGES: { id: OnboardingStage; label: string; icon: string }[] = [
  { id: "welcome", label: "Welcome", icon: "waving_hand" },
  { id: "videos", label: "Videos", icon: "play_circle" },
  { id: "sandbox", label: "Sandbox", icon: "science" },
  { id: "finish", label: "Finish", icon: "flag" },
];

/** What the launcher counts: every stage after the welcome. */
export type OnboardingTask = "videos" | "sandbox" | "finish";

export const TASKS: { id: OnboardingTask; label: string; hint: string }[] = [
  { id: "videos", label: "Watch your videos", hint: "A few minutes on each part of the admin you look after." },
  { id: "sandbox", label: "Try it in the sandbox", hint: "The real pages, with nothing saved." },
  { id: "finish", label: "Finish when you're ready", hint: "Hides this checklist. You can come back any time." },
];

/**
 * Roles a super admin can look at the admin as. Every access level except
 * super_admin itself: it holds all the others, so "previewing" it would show
 * nothing different.
 */
export type OnboardedRole = Exclude<AdminRole, "super_admin">;

export const ONBOARDED_ROLES: OnboardedRole[] = ADMIN_ROLES.filter(
  (r): r is OnboardedRole => r !== "super_admin",
);

export const ROLE_ICONS: Record<OnboardedRole, string> = {
  site_admin: "language",
  store_admin: "storefront",
  event_admin: "event",
  training_admin: "school",
  hr_admin: "badge",
  design_admin: "draw",
  sermon_admin: "mic",
  safeguarding_admin: "shield",
  destiny_one_admin: "smartphone",
};

/** The roles this person holds, in registry order, without super_admin. */
export function heldRoles(roles: RoleFlags): OnboardedRole[] {
  return ONBOARDED_ROLES.filter((role) => roles[role]);
}

export function progressFor(completed: ReadonlySet<string>): { done: number; total: number; pct: number } {
  const done = TASKS.filter((t) => completed.has(t.id)).length;
  return { done, total: TASKS.length, pct: Math.round((done / TASKS.length) * 100) };
}

/** `?onboarding=` values accepted on any /admin URL. */
export function stageFromParam(value: string | null): OnboardingStage | null {
  return STAGES.find((s) => s.id === value)?.id ?? null;
}
