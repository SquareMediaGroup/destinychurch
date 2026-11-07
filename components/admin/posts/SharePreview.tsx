"use client";

import type { PostFields } from "@/lib/posts";

/**
 * What the link looks like when it's shared, built from the same fallbacks the
 * public page's metadata uses (app/[slug]/page.tsx): share image, else the
 * header image; description as written. Shaped like a WhatsApp/Facebook link
 * card because that's where these pages are mostly shared.
 */
export function SharePreview({ form }: { form: PostFields }) {
  const image = form.og_image_url || (form.hero_style === "image" ? form.hero_image_url : null);
  const title = form.title.trim() || "Page title";
  const description = (form.description ?? "").trim();

  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
        When shared
      </p>
      <div className="overflow-hidden rounded-xl border border-black/10 bg-[#f0f2f5] dark:border-white/10 dark:bg-white/5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URL, a preview only
          <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
        ) : (
          <div className="flex aspect-[1.91/1] w-full items-center justify-center text-xs font-medium text-destiny-grey/40 dark:text-white/40">
            No image
          </div>
        )}
        <div className="space-y-0.5 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-destiny-grey/45 dark:text-white/45">
            destinytees.uk
          </p>
          <p className="line-clamp-2 text-sm font-bold text-destiny-grey dark:text-white">{title}</p>
          {description ? (
            <p className="line-clamp-2 text-xs text-destiny-grey/60 dark:text-white/60">{description}</p>
          ) : (
            <p className="text-xs italic text-destiny-grey/40 dark:text-white/40">No description</p>
          )}
        </div>
      </div>
    </div>
  );
}
