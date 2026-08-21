"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SHOP_ADMIN_API } from "@/lib/shop";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${SHOP_ADMIN_API}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create product");
        setSaving(false);
        return;
      }
      router.push(`/admin/store/products/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-10 sm:px-8">
      <Link
        href="/admin/store"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-destiny-grey/60 hover:text-destiny-grey"
      >
        <span className="material-symbols-rounded text-base">arrow_back</span>
        Store
      </Link>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-black text-destiny-grey">
        New product
      </h1>
      <p className="mt-1 text-sm text-destiny-grey/55">
        Give it a name to start — you can add photos, variants and pricing next.
      </p>

      <form onSubmit={create} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-destiny-grey/50">
            Product name
          </label>
          <input
            autoFocus
            data-tour="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Destiny Logo Tee"
            className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
          />
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          data-tour="product-submit"
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:bg-destiny-grey/30"
        >
          {saving ? "Creating…" : "Create & continue"}
          <span className="material-symbols-rounded text-lg">arrow_forward</span>
        </button>
      </form>
    </div>
  );
}
