"use client";

// The bar a super admin sees while looking at the admin as somebody else.
//
// It says "the sidebar and pages below" rather than "you are now a Store
// Admin", because the second one isn't true: middleware still knows they're a
// super admin and will still let them open anything they type into the address
// bar. This narrows what the interface offers, which is the question being
// asked — "what will a new Store Admin actually be handed?" — and nothing more.

import { TOURS } from "@/lib/adminOnboarding";
import { setRolePreview, type PreviewRole } from "@/lib/useAdminSession";

export default function RolePreviewBar({ role }: { role: PreviewRole }) {
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-destiny-grey px-4 py-2 text-center text-white">
      <span className="material-symbols-rounded text-base text-destiny-orange">visibility</span>
      <span className="text-xs font-bold uppercase tracking-widest">
        Previewing as {TOURS[role].label}
      </span>
      <span className="text-xs text-white/55">
        The sidebar and pages below show only what this access level offers — your own
        access is unchanged.
      </span>
      <button
        type="button"
        onClick={() => setRolePreview(null)}
        className="rounded-lg bg-white/15 px-3 py-1 text-xs font-bold transition hover:bg-white/25"
      >
        Exit preview
      </button>
    </div>
  );
}
