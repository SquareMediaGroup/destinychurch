"use client";

// Address, visibility, search/social previews, and the ways to hand the page
// out: a copyable link, a QR code for print, and the NFC tag URL.
//
// The QR and NFC links carry ?s=qr / ?s=nfc, so the Stats tab can tell a scan
// of the printed code from someone tapping a link on Instagram — the same tag
// scheme the shortlinks use (SRC_TAGS in lib/engagement.ts).

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { FieldShell, TextAreaField, TextField, ToggleField, fieldInputClass } from "@/components/admin/blocks/fields/BasicFields";
import { ImageField } from "@/components/admin/blocks/fields/ImageField";
import { useToast } from "@/components/ToastProvider";
import { MAIN_SLUG, SLUG_RE } from "@/lib/linkPages/types";
import { liveUrl, type EditorPage } from "./editorTypes";
import { Section } from "./controls";

function CopyRow({ label, value, help }: { label: string; value: string; help?: string }) {
  const toast = useToast();
  return (
    <FieldShell label={label} help={help}>
      <div className="flex gap-2">
        <input className={`${fieldInputClass} font-mono text-xs`} readOnly value={value} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              toast.success("Copied to the clipboard", "Copied");
            } catch {
              toast.error("Couldn't copy — select the text and copy it instead.");
            }
          }}
          className="shrink-0 rounded-xl border border-black/10 px-3 text-sm font-bold text-destiny-grey/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70"
        >
          Copy
        </button>
      </div>
    </FieldShell>
  );
}

export default function SettingsTab({
  page,
  setPage,
  savedSlug,
}: {
  page: EditorPage;
  setPage: (patch: Partial<EditorPage>) => void;
  /** The slug as last saved — share links point at what's live, not a draft. */
  savedSlug: string;
}) {
  const isMain = savedSlug === MAIN_SLUG;
  const canvasWrap = useRef<HTMLDivElement>(null);
  const svgWrap = useRef<HTMLDivElement>(null);
  const [qrSize] = useState(1024);

  const url = liveUrl(savedSlug);
  const qrUrl = `${url}?s=qr`;
  const nfcUrl = `${url}?s=nfc`;
  const fileBase = `destiny-links-${savedSlug}`;

  const downloadPng = () => {
    const canvas = canvasWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${fileBase}-qr.png`;
    a.click();
  };

  const downloadSvg = () => {
    const svg = svgWrap.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileBase}-qr.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const slugInvalid = !isMain && !SLUG_RE.test(page.slug);

  return (
    <div className="space-y-3">
      <Section title="Address" icon="link" defaultOpen>
        {isMain ? (
          <p className="text-sm text-destiny-grey/60 dark:text-white/60">
            This is the main page — it always lives at <strong>/links</strong> and is always published.
          </p>
        ) : (
          <>
            <FieldShell
              label="Web address"
              help="Lowercase letters, numbers and dashes. Changing it breaks any QR codes already printed."
            >
              <div className="flex items-center gap-1">
                <span className="shrink-0 text-sm text-destiny-grey/50 dark:text-white/50">/links/</span>
                <input
                  className={`${fieldInputClass} ${slugInvalid ? "border-destiny-red/50" : ""}`}
                  value={page.slug}
                  onChange={(e) => setPage({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                />
              </div>
            </FieldShell>
            <ToggleField
              label="Published"
              help="Off: the page is a draft and returns 'not found' to visitors."
              value={page.published}
              onChange={(v) => setPage({ published: v })}
            />
          </>
        )}
        <ToggleField
          label="Hide from search engines"
          help="For pages meant only for people with the link or QR code."
          value={page.noindex}
          onChange={(v) => setPage({ noindex: v })}
        />
      </Section>

      <Section title="Share" icon="qr_code_2" defaultOpen>
        {!page.published && !isMain && (
          <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-bold text-warning">
            This page isn&apos;t published yet — these links won&apos;t work until it is.
          </p>
        )}
        <CopyRow label="Link" value={url} help="For Instagram, Facebook and WhatsApp bios." />
        <CopyRow label="NFC tag link" value={nfcUrl} help="Write this to NFC tags so taps show up separately in Stats." />

        <FieldShell label="QR code" help="Scans are tagged, so you can see how many visits came from print.">
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <QRCodeSVG value={qrUrl} size={132} level="M" marginSize={0} />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={downloadPng}
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm font-bold text-destiny-grey/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">download</span>
                PNG (for screens)
              </button>
              <button
                type="button"
                onClick={downloadSvg}
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm font-bold text-destiny-grey/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">download</span>
                SVG (for print)
              </button>
            </div>
          </div>
          {/* Full-size copies, off-screen, that the download buttons read. */}
          <div className="hidden">
            <div ref={canvasWrap}>
              <QRCodeCanvas value={qrUrl} size={qrSize} level="M" marginSize={4} />
            </div>
            <div ref={svgWrap}>
              <QRCodeSVG value={qrUrl} size={qrSize} level="M" marginSize={4} />
            </div>
          </div>
        </FieldShell>
      </Section>

      <Section title="Search and social previews" icon="travel_explore" defaultOpen>
        <TextField
          label="Title"
          value={page.seo_title}
          maxLength={70}
          placeholder={page.title || "Defaults to the page name"}
          onChange={(v) => setPage({ seo_title: v })}
        />
        <TextAreaField
          label="Description"
          value={page.seo_description}
          maxLength={200}
          rows={2}
          placeholder={page.bio || "Defaults to the bio"}
          onChange={(v) => setPage({ seo_description: v })}
        />
        <ImageField
          label="Share image"
          help="Shown when the link is posted on social media. Defaults to the profile photo. 1200×630 works best."
          value={page.og_image_url}
          onChange={(v) => setPage({ og_image_url: v })}
        />
      </Section>
    </div>
  );
}
