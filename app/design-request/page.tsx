import type { Metadata } from "next";
import { cookies } from "next/headers";
import AnimateIn from "@/components/AnimateIn";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";
import DesignRequestForm from "./DesignRequestForm";

export const metadata: Metadata = {
  title: "Request a Design",
  description:
    "Need a poster, a flyer, a social graphic or something for a screen? Tell the Destiny Church design team what you need and follow it through to the finished file.",
  alternates: { canonical: "/design-request" },
};

// The session decides what this page shows and what the action stores, so it
// can't be prerendered.
export const dynamic = "force-dynamic";

const WHAT_WE_DO = [
  { icon: "photo_camera", label: "Social graphics", hint: "Instagram, Facebook, stories." },
  { icon: "print", label: "Print", hint: "Flyers, posters, booklets, banners." },
  { icon: "checkroom", label: "Apparel", hint: "T-shirts, hoodies, team kit." },
  { icon: "tv", label: "Screens & web", hint: "Slides, web banners, holding screens." },
];

export default async function DesignRequestPage() {
  const jar = await cookies();
  const {
    data: { user },
  } = await createClient(jar).auth.getUser();

  let defaultName = "";
  let defaultEmail = user?.email ?? "";
  let unmatched = false;

  if (user) {
    const service = createServiceClient();
    const { data: staff } = await service
      .from("hr_staff")
      .select("first_name, last_name, email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (staff) {
      defaultName = [staff.first_name, staff.last_name].filter(Boolean).join(" ");
      defaultEmail = staff.email || defaultEmail;
    } else {
      // Mirrors resolveRequesterIdentity: an admin with no HR record still
      // counts, so the banner must not tell them otherwise.
      const roles = await getRoles(service, user.id);
      unmatched = !Object.values(roles).some(Boolean);
    }
  }

  return (
    <>
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl px-4 py-[8rem] text-center"
          style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}
        >
          <AnimateIn>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Design Team
            </p>
            <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">
              Request a Design
            </h1>
            <p className="mx-auto max-w-xl text-base text-white/60 md:text-lg">
              Tell us what you need and one of the team will pick it up. You&apos;ll get a link
              to follow it and download the finished files.
            </p>
          </AnimateIn>
        </section>
      </div>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-16 md:grid-cols-2">
            <AnimateIn>
              <h2 className="mb-8 text-2xl font-black text-destiny-grey">
                What we can help with
              </h2>
              <div className="space-y-6">
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

              <div className="mt-10 rounded-3xl bg-[#f5f7fa] p-6">
                <p className="mb-2 text-sm font-bold text-destiny-grey">
                  How long does it take?
                </p>
                <p className="text-sm leading-relaxed text-destiny-grey/60">
                  It depends what else is in the queue, so give us as much notice as you can.
                  Staff requests made while signed in are fast-tracked. If it&apos;s urgent, say
                  so in the brief — and put a date in the &ldquo;needed by&rdquo; box.
                </p>
              </div>
            </AnimateIn>

            <AnimateIn>
              <h2 className="mb-8 text-2xl font-black text-destiny-grey">Tell us what you need</h2>
              <DesignRequestForm
                defaultName={defaultName}
                defaultEmail={defaultEmail}
                signedIn={Boolean(user)}
                unmatched={unmatched}
              />
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  );
}
