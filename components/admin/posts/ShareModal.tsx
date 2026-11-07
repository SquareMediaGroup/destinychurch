"use client";

import { useState } from "react";
import { Modal, ghostBtn, primaryBtn } from "@/components/admin/AdminUI";
import { RedirectQrModal } from "@/components/admin/redirects/RedirectQrModal";
import { useToast } from "@/components/ToastProvider";
import { useDialog } from "@/components/DialogProvider";
import { API, SITE_ORIGIN } from "@/lib/posts";
import { promoteHref } from "@/lib/promote";

/**
 * Getting the link out, in one place: the plain link, links tagged by where
 * they're being posted (so /admin/analytics can tell WhatsApp from Instagram —
 * `s` is lib/engagement.ts's closed SRC_TAGS set, `utm_source` is free text),
 * the printable QR code, and a 7-day review link for drafts.
 */
const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", params: "s=social&utm_source=whatsapp" },
  { id: "instagram", label: "Instagram", params: "s=social&utm_source=instagram" },
  { id: "facebook", label: "Facebook", params: "s=social&utm_source=facebook" },
  { id: "email", label: "Email", params: "utm_source=email" },
  { id: "notices", label: "Notice sheet", params: "s=print&utm_source=notices" },
] as const;

function CopyRow({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-destiny-grey dark:text-white">{label}</p>
        <p className="truncate font-mono text-[11px] text-destiny-grey/50 dark:text-white/50">{value}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} link copied.`, "Copied");
          } catch {
            toast.error("Couldn't copy. Select the link and copy it by hand.");
          }
        }}
      >
        Copy
      </button>
    </div>
  );
}

export function ShareModal({
  postId,
  slug,
  title,
  description,
  image,
  isPublished,
  onClose,
}: {
  postId: string;
  slug: string;
  title: string;
  description?: string | null;
  /** The share or header image, offered to the popup. */
  image?: string | null;
  /** As saved, not as toggled in the editor. */
  isPublished: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const { confirm } = useDialog();
  const [qrOpen, setQrOpen] = useState(false);
  const [review, setReview] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `${SITE_ORIGIN}/${slug}`;

  async function makeReviewLink() {
    setBusy(true);
    try {
      const res = await fetch(`${API}/${postId}/preview?kind=review`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || "Couldn't make a review link.");
        return;
      }
      setReview({ url: `${SITE_ORIGIN}${data.url}`, expiresAt: data.expiresAt });
    } finally {
      setBusy(false);
    }
  }

  async function revokeReviewLinks() {
    if (
      !(await confirm({
        title: "Turn off review links",
        message: "Every review and preview link sent for this page will stop working. You can make a new one afterwards.",
        confirmLabel: "Turn off",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`${API}/${postId}/preview`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't turn off review links.");
      return;
    }
    setReview(null);
    toast.success("Review links turned off.", "Done");
  }

  if (qrOpen) {
    return <RedirectQrModal slug={slug} label={title} onClose={() => setQrOpen(false)} />;
  }

  return (
    <Modal title="Share" onClose={onClose}>
      <div className="flex flex-col gap-6">
        {isPublished ? (
          <section className="flex flex-col gap-3">
            <CopyRow label="Link" value={url} />
            <div className="border-t border-black/5 pt-3 dark:border-white/8">
              <p className="mb-2 text-xs text-destiny-grey/55 dark:text-white/55">
                Tagged links, so Analytics shows which channel people came from.
              </p>
              <div className="flex flex-col gap-2.5">
                {CHANNELS.map((c) => (
                  <CopyRow key={c.id} label={c.label} value={`${url}?${c.params}`} />
                ))}
              </div>
            </div>
            <button type="button" className={`${ghostBtn} w-full`} onClick={() => setQrOpen(true)}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">qr_code_2</span>
              QR code for print
            </button>
          </section>
        ) : null}

        {isPublished ? (
          <section className="border-t border-black/5 pt-4 dark:border-white/8">
            <p className="text-sm font-bold text-destiny-grey dark:text-white">Promote on the site</p>
            <p className="mb-3 text-xs text-destiny-grey/55 dark:text-white/55">
              Opens the popup or banner settings with this page filled in. Nothing changes until you save there.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["popup", "Site popup", "web_asset"],
                  ["banner", "Banner", "campaign"],
                ] as const
              ).map(([target, label, icon]) => (
                <a
                  key={target}
                  href={promoteHref(target, {
                    title,
                    text: description ?? "",
                    link: `/${slug}`,
                    image: image ?? null,
                  })}
                  className={`${ghostBtn} w-full`}
                >
                  <span className="material-symbols-rounded text-lg" aria-hidden="true">{icon}</span>
                  {label}
                </a>
              ))}
            </div>
          </section>
        ) : (
          <p className="rounded-xl bg-[#f5f7fa] px-3 py-2.5 text-xs text-destiny-grey/60 dark:bg-white/5 dark:text-white/60">
            This page isn&apos;t published yet. Publish it to get its public link and QR code, or send a review link below.
          </p>
        )}

        <section className="border-t border-black/5 pt-4 dark:border-white/8">
          <p className="text-sm font-bold text-destiny-grey dark:text-white">Review link</p>
          <p className="mb-3 text-xs text-destiny-grey/55 dark:text-white/55">
            Lets someone see the saved version for 7 days, even while it&apos;s a draft. It isn&apos;t shown to search engines.
          </p>
          {review ? (
            <div className="flex flex-col gap-2">
              <CopyRow label="Review link" value={review.url} />
              <p className="text-[11px] text-destiny-grey/45 dark:text-white/45">
                Works until {new Date(review.expiresAt).toLocaleString()}.
              </p>
            </div>
          ) : (
            <button type="button" className={primaryBtn} disabled={busy} onClick={makeReviewLink}>
              {busy ? "Making link…" : "Make a review link"}
            </button>
          )}
          <button
            type="button"
            onClick={revokeReviewLinks}
            className="mt-3 block text-xs font-bold text-destiny-red hover:brightness-110"
          >
            Turn off all review links
          </button>
        </section>
      </div>
    </Modal>
  );
}
