"use client";

// Onboarding, seen from the super admin's side.
//
// Super admins hold every role, so what they want to know is not "what do I
// watch" but "what does the person I just created see when they log in?". This
// page answers that directly. Pick an access level and either open the sandbox
// as that role, or drop into the admin with the interface narrowed to it. Their
// videos are listed so you can see what they will be asked to watch.
//
// Narrowing is presentation only. Middleware still knows you're a super admin
// and will still open anything you type in the address bar; the preview bar
// says so rather than pretending otherwise.

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/AdminUI";
import { useOnboardingFlow } from "@/components/admin/onboarding/OnboardingProvider";
import { ONBOARDED_ROLES, ROLE_ICONS } from "@/lib/adminOnboarding";
import { ROLE_VIDEOS, isPublished } from "@/lib/adminHelpVideos";
import { NO_ROLES, roleLabel } from "@/lib/adminRoles";
import { useAdminSession, setRolePreview, type PreviewRole } from "@/lib/useAdminSession";
import { visibleItems } from "@/lib/adminNav";

const SECONDARY =
  "inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-4 py-2.5 text-sm font-bold text-destiny-grey/70 dark:text-white/70 transition hover:bg-[#f5f7fa] dark:hover:bg-white/10";

export default function OnboardingAdminPage() {
  const router = useRouter();
  const { actualRoles, previewRole, loaded } = useAdminSession();
  const { startRole } = useOnboardingFlow();

  function preview(role: PreviewRole) {
    setRolePreview(role);
    router.push("/admin");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Onboarding"
        subtitle="What each access level gets: a welcome, their videos, then a sandbox where nothing is saved. Opening one here also switches the admin to that access level's view."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          previewRole ? (
            <button type="button" className={SECONDARY} onClick={() => setRolePreview(null)}>
              Exit preview
            </button>
          ) : undefined
        }
      />

      {loaded && !actualRoles.super_admin && (
        <div className="mb-8 rounded-2xl bg-destiny-orange/10 px-4 py-3 text-sm font-bold text-destiny-orange">
          Previewing other access levels is limited to super admins.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {ONBOARDED_ROLES.map((role) => {
          const video = ROLE_VIDEOS.find((v) => v.role === role);
          const reach = visibleItems({ ...NO_ROLES, [role]: true });
          const active = previewRole === role;
          return (
            <div
              key={role}
              className={`flex flex-col rounded-3xl border bg-white p-6 shadow-sm dark:bg-destiny-grey-800 ${
                active
                  ? "border-destiny-orange/60 ring-2 ring-destiny-orange/20"
                  : "border-black/5 dark:border-white/8"
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-xl text-destiny-orange" aria-hidden="true">
                    {ROLE_ICONS[role]}
                  </span>
                </span>
                <h2 className="min-w-0 flex-1 text-base font-black text-destiny-grey dark:text-white">
                  {roleLabel(role)}
                </h2>
                {active && (
                  <span className="shrink-0 rounded-full bg-destiny-orange/10 px-2.5 py-1 text-[11px] font-bold text-destiny-orange">
                    Previewing
                  </span>
                )}
              </div>

              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
                Can reach
              </p>
              <p className="mb-4 text-sm text-destiny-grey/60 dark:text-white/60">
                {reach.map((item) => item.label).join(", ") || "Only the dashboard"}
              </p>

              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
                Their video
              </p>
              <p className="mb-5 text-sm text-destiny-grey/70 dark:text-white/70">
                {video ? video.title : "None yet"}
                {video && (
                  <span className="text-destiny-grey/45 dark:text-white/45">
                    {isPublished(video) ? ` · ${video.length ?? ""}` : " · coming soon"}
                  </span>
                )}
              </p>

              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
                  onClick={() => startRole(role, "sandbox")}
                >
                  <span className="material-symbols-rounded text-lg" aria-hidden="true">science</span>
                  Open the sandbox
                </button>
                <button type="button" className={SECONDARY} onClick={() => startRole(role, "videos")}>
                  <span className="material-symbols-rounded text-lg" aria-hidden="true">play_circle</span>
                  Their videos
                </button>
                {active ? (
                  <button type="button" className={SECONDARY} onClick={() => setRolePreview(null)}>
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">visibility_off</span>
                    Exit preview
                  </button>
                ) : (
                  <button type="button" className={SECONDARY} onClick={() => preview(role)}>
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">visibility</span>
                    Preview as {roleLabel(role)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
