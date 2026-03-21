import Link from "next/link";

const tools = [
  {
    href: "/admin/redirects",
    icon: "link",
    label: "Redirects",
    description: "Create and manage vanity URL redirects",
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-black text-destiny-grey">Settings</h1>
      <p className="mb-8 text-sm text-destiny-grey/50">Destiny Church Tees Valley — Admin Panel</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-destiny-orange/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
              <span className="material-symbols-rounded text-xl text-destiny-orange">{tool.icon}</span>
            </div>
            <div>
              <p className="font-bold text-destiny-grey">{tool.label}</p>
              <p className="mt-0.5 text-xs text-destiny-grey/50">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
