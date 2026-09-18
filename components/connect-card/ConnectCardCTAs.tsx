"use client";

import { useState } from "react";
import ChurchSuiteModal from "@/components/ui/ChurchSuiteModal";

type ModalType = "connect" | "prayer";

const FORMS: Record<ModalType, { src: string; title: string }> = {
  connect: {
    src: "https://destinytees.churchsuite.com/forms/kw3c1oly",
    title: "eConnectCard",
  },
  prayer: {
    src: "https://destinytees.churchsuite.com/forms/1yctuibm",
    title: "Prayer Request",
  },
};

/**
 * Both CTAs are designed for a dark band and say so in their markup: white
 * labels, a `border-white/25` outline, white icons.
 *
 * There used to be a `variant?: "dark" | "light"` prop, but it only switched
 * the subtitle colour — everything else stayed hardcoded white — so
 * `variant="light"` would have rendered white text on a white surface. Neither
 * call site passed it. Removed rather than finished: a light treatment should
 * be built when something actually needs one, against a real design, instead
 * of left as a prop that breaks the first time it is used.
 */
export default function ConnectCardCTAs() {
  const [open, setOpen] = useState<ModalType | null>(null);
  // Only read when `open` is non-null (the modal renders nothing otherwise);
  // the fallback just keeps this a plain lookup rather than a nullable one.
  const form = FORMS[open ?? "connect"];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        {/* eConnectCard */}
        <button
          onClick={() => setOpen("connect")}
          className="group flex items-center gap-4 rounded-2xl bg-destiny-orange px-7 py-4 text-left shadow-xl shadow-destiny-orange/30 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-2xl text-white" aria-hidden="true">person_add</span>
          <span>
            <span className="block text-sm font-black text-white">Fill in a Connect Card</span>
            <span className="block text-xs text-on-dark-muted">Let us know who you are</span>
          </span>
          <span className="material-symbols-rounded ml-4 text-lg text-white/60 transition group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
        </button>

        {/* Prayer Request */}
        <button
          onClick={() => setOpen("prayer")}
          className="group flex items-center gap-4 rounded-2xl border-2 border-white/25 px-7 py-4 text-left transition hover:border-destiny-orange"
        >
          <span className="material-symbols-rounded text-2xl text-destiny-orange" aria-hidden="true">volunteer_activism</span>
          <span>
            <span className="block text-sm font-black text-white">Submit a Prayer Request</span>
            <span className="block text-xs text-on-dark-muted">We&apos;d love to pray with you</span>
          </span>
          <span className="material-symbols-rounded ml-4 text-lg text-white/40 transition group-hover:translate-x-1 group-hover:text-destiny-orange" aria-hidden="true">arrow_forward</span>
        </button>
      </div>

      <ChurchSuiteModal
        open={open !== null}
        onClose={() => setOpen(null)}
        src={form.src}
        title={form.title}
      />
    </>
  );
}
