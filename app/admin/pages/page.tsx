import Link from "next/link";
import { PAGE_FIELDS } from "@/lib/pageFields";

export default function AdminPagesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Pages</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Edit key content fields across the site.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {Object.entries(PAGE_FIELDS).map(([slug, page]) => (
            <Link
              key={slug}
              href={`/admin/pages/${slug}`}
              className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white px-6 py-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
                <span className="material-symbols-rounded text-xl text-destiny-orange">{page.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-destiny-grey">{page.label}</p>
                <p className="text-xs text-destiny-grey/50">{page.description}</p>
              </div>
              <span className="material-symbols-rounded text-xl text-destiny-grey/30">chevron_right</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
