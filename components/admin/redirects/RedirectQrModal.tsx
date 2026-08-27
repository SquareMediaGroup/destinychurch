"use client";

// A printable QR code for one short link.
//
// The whole point is the ?s=qr tag baked into the encoded URL. A flyer on the
// welcome desk and the same link pasted into the church WhatsApp both resolve
// through app/[slug]/page.tsx, and without a tag on the printed one there is
// no way to ever tell "the flyer worked" from "someone shared it online" —
// see the "How they got here" breakdown on /admin/analytics.
//
// Two downloads, both produced client-side from the rendered <svg>:
//   • SVG — what a printer actually wants (vector, scales to a poster with no
//     loss). qrcode.react is already a dependency (see TextToGiveCTA.tsx), so
//     this needed no new package.
//   • PNG — what someone pastes into a slide or a Canva flyer. Rendered onto a
//     canvas at a fixed print-friendly size, with a white background painted
//     in first — a transparent PNG prints as a grey smear on most printers.

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Modal, ghostBtn, primaryBtn } from "@/components/admin/AdminUI";

const PNG_SIZE = 1024;

export function RedirectQrModal({
  slug,
  label,
  onClose,
}: {
  slug: string;
  label: string | null;
  onClose: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState<"svg" | "png" | null>(null);

  // Hardcoded, not user-editable: "qr" is the one tag this modal exists to
  // print, and letting someone type a free-form tag here would either land
  // outside lib/engagement.ts's closed SRC_TAGS set (silently read back as
  // "Direct" on the analytics page) or need that set widened for one modal.
  const url = `https://destinytees.uk/${slug}?s=qr`;

  function serialise(): string | null {
    const svg = svgRef.current;
    if (!svg) return null;
    return new XMLSerializer().serializeToString(svg);
  }

  function saveBlob(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function downloadSvg() {
    const markup = serialise();
    if (!markup) return;
    saveBlob(new Blob([markup], { type: "image/svg+xml" }), `destinytees-${slug}-qr.svg`);
  }

  function downloadPng() {
    const markup = serialise();
    if (!markup) return;
    setBusy("png");

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setBusy(null);
        return;
      }
      // Fill white first — the source SVG has a transparent background, and a
      // transparent PNG prints as a grey mess on most home/office printers.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, PNG_SIZE, PNG_SIZE);
      ctx.drawImage(image, 0, 0, PNG_SIZE, PNG_SIZE);

      canvas.toBlob((blob) => {
        if (blob) saveBlob(blob, `destinytees-${slug}-qr.png`);
        setBusy(null);
      }, "image/png");
    };
    image.onerror = () => setBusy(null);
    // Encoding the SVG markup as a data URL rather than a blob URL: Safari has
    // historically refused to draw a blob: URL onto a canvas via drawImage.
    image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(markup)))}`;
  }

  return (
    <Modal title={`QR code for /${slug}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        {label && <p className="text-sm font-bold text-destiny-grey">{label}</p>}

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <QRCodeSVG ref={svgRef} value={url} size={220} level="H" marginSize={4} />
        </div>

        <p className="max-w-xs text-center font-mono text-xs text-destiny-grey/50">{url}</p>

        <div className="flex gap-3">
          <button type="button" className={ghostBtn} onClick={downloadSvg}>
            <span className="material-symbols-rounded text-lg">download</span>
            Download SVG
          </button>
          <button
            type="button"
            className={primaryBtn}
            onClick={downloadPng}
            disabled={busy === "png"}
          >
            <span className="material-symbols-rounded text-lg">download</span>
            {busy === "png" ? "Preparing…" : "Download PNG"}
          </button>
        </div>

        <p className="text-center text-xs text-destiny-grey/40">
          Scans of this code show up on the Analytics page, tagged separately from links
          clicked online.
        </p>
      </div>
    </Modal>
  );
}
