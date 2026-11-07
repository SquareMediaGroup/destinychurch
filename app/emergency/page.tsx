import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EMERGENCY_COOKIE, verifyEmergencyToken } from "@/lib/emergencyAccess";
import { getEventIndex } from "@/lib/events.server";
import { STATUS_PAGE_URL } from "@/lib/outage";
import { createServiceClient } from "@/utils/supabase/service";
import { emergencySignOut } from "./actions";

// The one page a break-glass session opens (lib/emergencyAccess.ts): is each
// service reachable right now, what visitors are seeing, and where to look.
// Staff-only, so naming the providers is fine here.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Emergency access",
  robots: { index: false, follow: false },
};

async function dataReachable(): Promise<boolean> {
  try {
    const { error } = await createServiceClient()
      .from("site_banner")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

function Row({ name, ok, detail }: { name: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-black/[0.07] bg-white p-4">
      <span
        className={`material-symbols-rounded mt-0.5 text-xl ${ok ? "text-green-600" : "text-[#b45309]"}`}
        aria-hidden="true"
      >
        {ok ? "check_circle" : "warning"}
      </span>
      <div>
        <p className="font-bold text-destiny-grey">
          {name}: {ok ? "working" : "not reachable"}
        </p>
        <p className="mt-0.5 text-sm text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default async function EmergencyPage() {
  // Middleware already checked this; checked again so the page never relies on
  // the matcher list alone.
  const session = await verifyEmergencyToken((await cookies()).get(EMERGENCY_COOKIE)?.value);
  if (!session) redirect("/login");

  const [dataOk, events] = await Promise.all([dataReachable(), getEventIndex()]);
  const eventsOk = !events.unavailable;

  return (
    <section className="bg-[#f5f7fa] px-4 pb-20 pt-32">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">Emergency access</p>
        <h1 className="mt-2 text-3xl font-black text-destiny-grey">Service status</h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as {session.email} with the emergency login. This session only opens this
          page, and ends after 8 hours or when you sign out.
        </p>

        <ul className="mt-8 space-y-3">
          <Row
            name="Database and sign-in (Supabase)"
            ok={dataOk}
            detail={
              dataOk
                ? "Back up. Sign out and sign in normally to use the dashboard."
                : "Admin, the shop, training, jobs and builder pages can't load until this is back. Visitors see the outage banner and a fail state on those pages."
            }
          />
          <Row
            name="Events calendar (ChurchSuite)"
            ok={eventsOk}
            detail={
              eventsOk
                ? "Events are loading as normal."
                : "Visitors see the weekly gatherings in place of the calendar, and ChurchSuite forms show a contact card."
            }
          />
        </ul>

        <h2 className="mt-10 text-lg font-black text-destiny-grey">Where to look</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a href={STATUS_PAGE_URL} className="font-semibold text-destiny-orange underline">
              status.destinytees.uk
            </a>{" "}
            <span className="text-muted">— what members see</span>
          </li>
          <li>
            <a href="https://status.supabase.com" className="font-semibold text-destiny-orange underline">
              status.supabase.com
            </a>
          </li>
          <li>
            <a href="https://www.vercel-status.com" className="font-semibold text-destiny-orange underline">
              vercel-status.com
            </a>
          </li>
        </ul>

        <form action={emergencySignOut} className="mt-10">
          <button
            type="submit"
            className="rounded-full border border-destiny-grey/20 bg-white px-5 py-2.5 text-sm font-bold text-destiny-grey transition hover:border-destiny-grey/40"
          >
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
