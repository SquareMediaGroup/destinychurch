"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PAGE_FIELDS } from "@/lib/pageFields";

export default function AdminPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const page = PAGE_FIELDS[slug];

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!page) return;
    fetch(`/api/admin/pages/${slug}`)
      .then((r) => r.json())
      .then((d) => setValues(d))
      .finally(() => setLoading(false));
  }, [slug, page]);

  if (!page) {
    router.replace("/admin/pages");
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/pages/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pt-28">
      <div className="max-w-2xl">

        {/* Back */}
        <Link
          href="/admin/pages"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-destiny-grey/50 transition hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-base">arrow_back</span>
          Pages
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destiny-orange/10">
              <span className="material-symbols-rounded text-lg text-destiny-orange">{page.icon}</span>
            </div>
            <h1 className="text-2xl font-black text-destiny-grey">{page.label}</h1>
          </div>
          <p className="mt-1 text-sm text-destiny-grey/50">{page.description}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">progress_activity</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm flex flex-col gap-5">
              {page.fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>
              ))}
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {saved ? (
                  <>
                    <span className="material-symbols-rounded text-base">check</span>
                    Saved
                  </>
                ) : saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
