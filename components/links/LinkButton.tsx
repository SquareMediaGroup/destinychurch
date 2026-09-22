"use client";

// One link block on a links page — a button row, or a featured image card.
//
// A client component only for three things: the click beacon (lib/track.ts),
// opening a ChurchSuite link in the in-page modal instead of leaving the page,
// and swallowing clicks in the editor's preview.

import { useState } from "react";
import Link from "next/link";
import ChurchSuiteModal from "@/components/ui/ChurchSuiteModal";
import { trackClick } from "@/lib/track";
import { isEmbeddable } from "@/lib/nfcTiles";
import { isInternalHref, safeHref, safeMediaUrl } from "@/lib/linkPages/urls";
import type { LinkBlockOf } from "@/lib/linkPages/types";

export default function LinkButton({
  block,
  preview,
}: {
  block: LinkBlockOf<"link">;
  preview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const d = block.data;
  const href = safeHref(d.url);
  if (!href) return null;

  const popup = d.open === "popup" && isEmbeddable(href);
  const newTab = !popup && d.open === "new";
  const thumbnail = safeMediaUrl(d.thumbnail);
  const featured = d.style === "featured";

  const onClick = (e: React.MouseEvent) => {
    if (preview) {
      e.preventDefault();
      return;
    }
    trackClick("links", block.id, d.title);
    if (popup) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const arrow = (
    <span className="lp-btn-arrow material-symbols-rounded" aria-hidden="true">
      {newTab ? "open_in_new" : "arrow_forward"}
    </span>
  );

  const content = featured ? (
    <>
      <span className="lp-btn-fill" aria-hidden="true" />
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL, no intrinsic size
        <img className="lp-btn-art" src={thumbnail} alt="" loading="lazy" />
      ) : (
        <span className="lp-btn-art-fallback" aria-hidden="true">
          <span className="material-symbols-rounded">{d.icon || "link"}</span>
        </span>
      )}
      <span className="lp-btn-caption">
        <span className="lp-btn-body">
          <span className="lp-btn-title">{d.title}</span>
          {d.subtitle && <span className="lp-btn-sub">{d.subtitle}</span>}
        </span>
        {arrow}
      </span>
    </>
  ) : (
    <>
      <span className="lp-btn-fill" aria-hidden="true" />
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL, no intrinsic size
        <img className="lp-btn-thumb" src={thumbnail} alt="" loading="lazy" />
      ) : (
        <span className="lp-btn-icon material-symbols-rounded" aria-hidden="true">
          {d.icon}
        </span>
      )}
      <span className="lp-btn-body">
        <span className="lp-btn-title">{d.title}</span>
        {d.subtitle && <span className="lp-btn-sub">{d.subtitle}</span>}
      </span>
      {arrow}
    </>
  );

  const common = {
    className: "lp-btn",
    "data-variant": featured ? "featured" : "button",
    "data-highlight": d.highlight,
    onClick,
  };

  return (
    <>
      {isInternalHref(href) && !newTab ? (
        <Link href={href} prefetch={false} {...common}>
          {content}
        </Link>
      ) : (
        <a
          href={href}
          {...common}
          {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {content}
          {newTab && <span className="sr-only"> (opens in a new tab)</span>}
        </a>
      )}
      {popup && (
        <ChurchSuiteModal
          open={open}
          onClose={() => setOpen(false)}
          src={href}
          title={d.title}
          subtitle={d.subtitle || undefined}
          size="lg"
        />
      )}
    </>
  );
}
