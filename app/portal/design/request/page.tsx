import type { Metadata } from "next";
import Link from "next/link";
import { readPortalUser } from "@/lib/staffPortalAuth";
import DesignRequestForm from "./DesignRequestForm";

export const metadata: Metadata = {
  title: "Request a Design",
};

// Staff identity comes from the session on every load, so this can't be
// prerendered.
export const dynamic = "force-dynamic";

const WHAT_WE_DO = [
  { icon: "photo_camera", label: "Social graphics", hint: "Instagram, Facebook, stories." },
  { icon: "print", label: "Print", hint: "Flyers, posters, booklets, banners." },
  { icon: "checkroom", label: "Apparel", hint: "T-shirts, hoodies, team kit." },
  { icon: "tv", label: "Screens & web", hint: "Slides, web banners, holding screens." },
];

export default async function PortalDesignRequestPage() {
  // Middleware already guarantees a linked hr_staff row for every /portal
  // request, so this is always a verified, fast-tracked requester.
  const identity = await readPortalUser();
  const defaultName = identity
    ? [identity.staff.first_name, identity.staff.last_name].filter(Boolean).join(" ")
    : "";
  const defaultEmail = identity?.staff.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/design"
          className="inline-flex items-center gap-1 text-sm font-bold text-destiny-grey/50 transition hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-lg" aria-hidden="true">arrow_back</span>
          My design requests
        </Link>
        <h1 className="mt-3 text-2xl font-black text-destiny-grey">Request a design</h1>
        <p className="mt-1 text-sm text-destiny-grey/60">
          Tell us what you need and one of the team will pick it up. You&apos;ll get a link to
          follow it and download the finished files.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="mb-6 text-lg font-black text-destiny-grey">What we can help with</h2>
          <div className="space-y-5">
            {WHAT_WE_DO.map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-xl text-destiny-orange">
                    {item.icon}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-sm font-bold text-destiny-grey">{item.label}</p>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{item.hint}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-[#f5f7fa] p-5">
            <p className="mb-2 text-sm font-bold text-destiny-grey">How long does it take?</p>
            <p className="text-sm leading-relaxed text-destiny-grey/60">
              It depends what else is in the queue, so give us as much notice as you can.
              Staff requests are fast-tracked. If it&apos;s urgent, say so in the brief — and put
              a date in the &ldquo;needed by&rdquo; box.
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-lg font-black text-destiny-grey">Tell us what you need</h2>
          <DesignRequestForm defaultName={defaultName} defaultEmail={defaultEmail} />
        </div>
      </div>
    </div>
  );
}
