import Link from "next/link";

export const metadata = {
  title: "Administration",
};

type Tile = {
  href?: string;
  icon: string;
  title: string;
  description: string;
  available?: boolean;
};

const TILES: Tile[] = [
  {
    href: "/administration/hr",
    icon: "badge",
    title: "HR",
    description: "Staff directory, leave, documents and reviews.",
    available: true,
  },
  {
    href: "/administration/training",
    icon: "school",
    title: "Training",
    description: "Team training categories, sub-groups and posts.",
    available: true,
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
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-destiny-grey md:text-4xl">
          Administration
        </h1>
        <p className="mt-2 max-w-xl text-destiny-grey/55">
          The home for day-to-day church administration. More modules will appear
          here as they come online.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => {
          const inner = (
            <>
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                  t.available
                    ? "bg-destiny-orange/10 text-destiny-orange"
                    : "bg-black/5 text-destiny-grey/40"
                }`}
              >
                <span className="material-symbols-rounded text-[26px]">{t.icon}</span>
              </div>
              <h2 className="text-base font-bold text-destiny-grey">{t.title}</h2>
              <p className="mt-1 text-sm leading-snug text-destiny-grey/50">
                {t.description}
              </p>
              {t.available ? (
                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-destiny-orange">
                  Open
                  <span className="material-symbols-rounded text-sm">arrow_forward</span>
                </span>
              ) : (
                <span className="mt-4 inline-block rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/40">
                  Coming soon
                </span>
              )}
            </>
          );

          return t.href ? (
            <Link
              key={t.title}
              href={t.href}
              className="group rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={t.title}
              className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
