"use client";

import { useState } from "react";

type Faq = { q: string; a: string };

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mt-10 space-y-2">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">Frequently Asked Questions</p>
      {faqs.map((faq, i) => (
        <div key={faq.q} className="overflow-hidden rounded-2xl bg-white">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="text-sm font-black text-destiny-grey">{faq.q}</span>
            <span className={`material-symbols-rounded shrink-0 text-xl text-destiny-orange transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}>
              expand_more
            </span>
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p className="text-sm leading-relaxed text-destiny-grey/60">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
