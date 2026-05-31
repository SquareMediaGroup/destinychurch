import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Administration",
};

const SECTIONS = [
  {
    icon: "groups",
    title: "People",
    description: "Members, contacts and households.",
  },
  {
    icon: "diversity_3",
    title: "Teams & Rotas",
    description: "Serving teams, scheduling and availability.",
  },
  {
    icon: "how_to_reg",
    title: "Check-In",
    description: "Attendance for services and groups.",
  },
  {
    icon: "insights",
    title: "Reports",
    description: "Giving, growth and engagement insights.",
  },
];

export default function AdministrationPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="relative h-7 w-[140px]">
              <Image
                src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
                alt="Destiny Church"
                fill
                priority
                sizes="140px"
                className="object-contain object-left"
              />
            </div>
            <span className="hidden rounded-full bg-destiny-orange/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destiny-orange sm:inline-block">
              Administration
            </span>
          </div>
          <Link
            href="/admin-login"
            className="flex items-center gap-1.5 text-sm font-bold text-destiny-grey/60 transition hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-lg">grid_view</span>
            Switch system
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-destiny-grey md:text-4xl">
            Administration
          </h1>
          <p className="mt-2 max-w-xl text-destiny-grey/55">
            The home for day-to-day church administration. Modules will appear
            here as they come online.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10 text-destiny-orange">
                <span className="material-symbols-rounded text-[26px]">
                  {s.icon}
                </span>
              </div>
              <h2 className="text-base font-bold text-destiny-grey">
                {s.title}
              </h2>
              <p className="mt-1 text-sm leading-snug text-destiny-grey/50">
                {s.description}
              </p>
              <span className="mt-4 inline-block rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/40">
                Coming soon
              </span>
            </div>
          ))}
        </div>

        {/* Empty-state note */}
        <div className="mt-10 flex items-start gap-4 rounded-3xl border border-dashed border-destiny-grey/15 bg-white/50 p-6">
          <span className="material-symbols-rounded mt-0.5 text-2xl text-destiny-orange">
            construction
          </span>
          <div>
            <h3 className="font-bold text-destiny-grey">Under construction</h3>
            <p className="mt-1 text-sm text-destiny-grey/55">
              This area is scaffolded and ready. Tell us which administration
              tools to build first and we&apos;ll wire them up.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
