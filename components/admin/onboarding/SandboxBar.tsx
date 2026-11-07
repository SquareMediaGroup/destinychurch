"use client";

// The bar across the top while the sandbox is open. It is the sandbox's whole
// interface: say plainly that nothing is saved, and offer the two ways out -
// back to the videos, or on to Finish. Everything else is the real admin.
//
// Sticky rather than a modal, because the point is to use the pages behind it.

import { TASKS } from "@/lib/adminOnboarding";
import { roleLabel } from "@/lib/adminRoles";
import type { PreviewRole } from "@/lib/useAdminSession";

export default function SandboxBar({
  previewRole,
  onVideos,
  onFinish,
}: {
  previewRole: PreviewRole | null;
  onVideos: () => void;
  onFinish: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Sandbox"
      className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-destiny-orange px-4 py-2 text-center text-white"
    >
      <span className="material-symbols-rounded text-base" aria-hidden="true">science</span>
      <span className="text-xs font-bold uppercase tracking-widest">
        Sandbox{previewRole ? `: ${roleLabel(previewRole)} view` : ""}
      </span>
      <span className="text-xs text-white/90">
        Use any page and press any button. Nothing you do here is saved.
      </span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVideos}
          className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold transition hover:bg-white/30"
        >
          Watch videos
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-destiny-orange transition hover:bg-white/90"
        >
          {TASKS[2].label}
        </button>
      </span>
    </div>
  );
}
