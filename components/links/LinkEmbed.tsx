"use client";

// An embed block: a YouTube/Vimeo video, a Spotify or Apple Podcasts player, a
// Google Map, or a ChurchSuite form — inline on the page, or behind a button
// that opens it in a modal.
//
// Third-party players wait behind the same media-cookie consent as
// components/missions/MediaEmbed.tsx, since they set cookies the moment they
// load. ChurchSuite goes through ChurchSuiteEmbed, which has its own gate.

import { useState } from "react";
import Link from "next/link";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";
import Modal from "@/components/ui/Modal";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useHydrated } from "@/lib/useHydrated";
import { trackClick } from "@/lib/track";
import { toEmbed, type EmbedTarget } from "@/lib/linkPages/urls";
import type { LinkBlockOf } from "@/lib/linkPages/types";

const KIND_LABEL: Record<EmbedTarget["kind"], { noun: string; icon: string }> = {
  youtube: { noun: "video", icon: "play_circle" },
  vimeo: { noun: "video", icon: "play_circle" },
  spotify: { noun: "player", icon: "music_note" },
  "apple-podcasts": { noun: "podcast", icon: "podcasts" },
  maps: { noun: "map", icon: "map" },
  churchsuite: { noun: "form", icon: "edit_note" },
};

function Player({ target, title }: { target: EmbedTarget; title: string }) {
  const mounted = useHydrated();
  const { consent, savePreferences } = useCookieConsent();

  if (target.kind === "churchsuite") {
    return <ChurchSuiteEmbed src={target.src} title={title} height={target.height ?? 620} />;
  }

  const sizeStyle = target.height ? { height: target.height } : { aspectRatio: "16 / 9" };

  if (!mounted || consent?.media !== true) {
    return (
      <div className="lp-consent" style={target.height ? { minHeight: Math.max(target.height, 180) } : { aspectRatio: "16 / 9" }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 32, opacity: 0.5 }}>
          cookie
        </span>
        <p>This {KIND_LABEL[target.kind].noun} is provided by a third party and needs media cookies to load.</p>
        <button
          type="button"
          className="lp-pill"
          onClick={() => savePreferences({ media: true, analytics: consent?.analytics ?? false })}
        >
          Allow media cookies
        </button>
        <p>
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={target.src}
      title={title}
      style={sizeStyle}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

export default function LinkEmbed({
  block,
  preview,
}: {
  block: LinkBlockOf<"embed">;
  preview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const target = toEmbed(block.data.url);
  if (!target) return null;

  const title = block.data.title || `Embedded ${KIND_LABEL[target.kind].noun}`;

  if (block.data.display === "popup") {
    return (
      <>
        <button
          type="button"
          className="lp-btn"
          onClick={() => {
            if (preview) return;
            trackClick("links", block.id, title);
            setOpen(true);
          }}
        >
          <span className="lp-btn-fill" aria-hidden="true" />
          <span className="lp-btn-icon material-symbols-rounded" aria-hidden="true">
            {KIND_LABEL[target.kind].icon}
          </span>
          <span className="lp-btn-body">
            <span className="lp-btn-title">{title}</span>
          </span>
          <span className="lp-btn-arrow material-symbols-rounded" aria-hidden="true">
            open_in_full
          </span>
        </button>
        <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
          <div className="lp-embed" style={{ borderRadius: 16 }}>
            <Player target={target} title={title} />
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div>
      {block.data.title && <p className="lp-embed-title">{block.data.title}</p>}
      <div className="lp-embed">
        {/* In the editor the preview never loads third-party players — a
            placeholder shows where it will sit without the network cost. */}
        {preview ? (
          <div className="lp-consent" style={target.height ? { height: target.height } : { aspectRatio: "16 / 9" }}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 36, opacity: 0.6 }}>
              {KIND_LABEL[target.kind].icon}
            </span>
            <p>{title}</p>
          </div>
        ) : (
          <Player target={target} title={title} />
        )}
      </div>
    </div>
  );
}
