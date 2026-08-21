"use client";

// Onboarding, seen from the super admin's side.
//
// Super admins never get onboarding themselves — they hold every role, so
// "their" tour would be every tour at once, and none of it would tell them what
// they actually want to know: what does the person I just created see when they
// log in? This page answers that directly. Pick an access level and either walk
// its tour or drop into the admin with the interface narrowed to it.
//
// Narrowing is presentation only. Middleware still knows you're a super admin
// and will still open anything you type in the address bar; the preview bar
// says so rather than pretending otherwise.

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/AdminUI";
import { useOnboardingTour } from "@/components/admin/onboarding/OnboardingProvider";
import {
  TOURS,
  TOUR_ORDER,
  checklistForRole,
  minutesFor,
} from "@/lib/adminOnboarding";
import { ROLE_LABELS } from "@/lib/adminOnboarding";
import { useAdminSession, setRolePreview, type PreviewRole } from "@/lib/useAdminSession";
import { visibleItems } from "@/lib/adminNav";
import { NO_ROLES } from "@/lib/adminRoles";

export default function OnboardingAdminPage() {
  const router = useRouter();
  const { actualRoles, previewRole, loaded } = useAdminSession();
  const { startRole } = useOnboardingTour();

  function preview(role: PreviewRole) {
    setRolePreview(role);
    router.push("/admin");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Onboarding"
        subtitle="What each access level is taught when they first sign in — and what the admin looks like from their side."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          previewRole ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
              onClick={() => setRolePreview(null)}
            >
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
        {TOUR_ORDER.map((role) => {
          const tour = TOURS[role];
          const sections = checklistForRole(role);
          const reach = visibleItems({ ...NO_ROLES, [role]: true });
          return (
            <div
              key={role}
              className="flex flex-col rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-xl text-destiny-orange">
                    {tour.icon}
                  </span>
                </span>
                <div>
                  <h2 className="text-base font-black text-destiny-grey">{tour.label}</h2>
                  <p className="text-xs text-destiny-grey/50">{tour.blurb}</p>
                </div>
              </div>

              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
                Can reach
              </p>
              <p className="mb-4 text-sm text-destiny-grey/60">
                {reach.map((item) => item.label).join(", ") || "Only the dashboard"}
              </p>

              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
                Their checklist · about {minutesFor(sections)} min
              </p>
              <ol className="mb-5 space-y-1">
                {sections.map((section, i) => (
                  <li key={section.id} className="flex gap-2 text-sm text-destiny-grey/70">
                    <span className="tabular-nums text-destiny-grey/35">{i + 1}.</span>
                    {section.label}
                  </li>
                ))}
              </ol>

              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
                  onClick={() => startRole(role)}
                >
                  <span className="material-symbols-rounded text-lg">play_arrow</span>
                  Run this tour
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
                  onClick={() => preview(role)}
                >
                  <span className="material-symbols-rounded text-lg">visibility</span>
                  Preview as {ROLE_LABELS[role]}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
