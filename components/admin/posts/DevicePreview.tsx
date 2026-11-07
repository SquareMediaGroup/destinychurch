"use client";

import { useEffect, useState } from "react";
import { useScrollLock } from "@/lib/useScrollLock";

const DEVICES = [
  { id: "phone", label: "Phone", icon: "smartphone", width: 390 },
  { id: "tablet", label: "Tablet", icon: "tablet", width: 820 },
  { id: "desktop", label: "Computer", icon: "desktop_windows", width: 1440 },
] as const;
type DeviceId = (typeof DEVICES)[number]["id"];

/**
 * The saved draft as visitors will see it, at phone, tablet and computer
 * widths, without leaving the editor. It's the real page (the signed preview
 * link) in a frame, so wide blocks, rails and the header all behave as they
 * will live. The computer width is scaled down to fit when the screen is
 * narrower than it.
 */
export function DevicePreview({ url, onClose }: { url: string; onClose: () => void }) {
  const [device, setDevice] = useState<DeviceId>("phone");
  const [available, setAvailable] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth - 48));
  useScrollLock(true);

  useEffect(() => {
    const onResize = () => setAvailable(window.innerWidth - 48);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Close the preview, not the editor behind it.
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("resize", onResize);
    // Capture, so this runs before the editor's own Escape handler.
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const width = DEVICES.find((d) => d.id === device)!.width;
  const scale = Math.min(1, available / width);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-destiny-grey-900/95" role="dialog" aria-label="Preview">
      <div className="flex shrink-0 items-center gap-2 px-4 py-3 text-white">
        <p className="mr-auto text-sm font-bold">Preview</p>
        <div role="radiogroup" aria-label="Screen size" className="flex gap-1 rounded-xl bg-white/10 p-1">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={device === d.id}
              onClick={() => setDevice(d.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                device === d.id ? "bg-white text-destiny-grey" : "text-white/70 hover:text-white"
              }`}
            >
              <span className="material-symbols-rounded text-[17px]" aria-hidden="true">{d.icon}</span>
              <span className="hidden sm:inline">{d.label}</span>
            </button>
          ))}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 hidden rounded-lg px-2.5 py-1.5 text-xs font-bold text-white/70 hover:text-white sm:block"
        >
          Open in a new tab
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <span className="material-symbols-rounded text-xl" aria-hidden="true">close</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-6 pb-6">
        <div className="mx-auto h-full" style={{ width: width * scale }}>
          <iframe
            key={device}
            src={url}
            title="Page preview"
            style={{ width, height: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: "top left" }}
            className="rounded-xl bg-white shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
