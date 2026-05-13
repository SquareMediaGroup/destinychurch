"use client";

import { useState } from "react";
import AnimateIn from "@/components/AnimateIn";

const faqs = [
  {
    q: "What ages can attend the camp?",
    a: "The camp is open to children in Year 1 to Year 6.",
  },
  {
    q: "How much does it cost?",
    a: "The camp costs £85 per child, which covers accommodation, meals, crafts and activities. Transportation is not included.",
  },
  {
    q: "Can I pay in instalments?",
    a: "Yes, you can either pay a deposit and pay the balance in two instalments, or pay in full right away.",
  },
  {
    q: "What about transportation?",
    a: "Parents are responsible for transportation — drop-off at the venue and pick-up after camp.",
  },
  {
    q: "Who do I contact if I have questions?",
    a: "Please contact Funke Awojide via email (funke@destinytees.uk) or by phone (07867077614).",
  },
];

export default function KidsCampFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-grey md:text-4xl">
            Frequently Asked Questions
          </h2>
        </AnimateIn>
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <AnimateIn key={i} delay={i * 60}>
                <details
                  open={isOpen}
                  className="group overflow-hidden rounded-2xl border border-black/5 bg-[#f5f7fa] transition-all hover:border-destiny-orange/20"
                >
                  <summary
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen(isOpen ? null : i);
                    }}
                    className="flex cursor-pointer items-center justify-between px-6 py-4 text-left font-bold text-destiny-grey transition hover:text-destiny-orange"
                  >
                    <span>{faq.q}</span>
                    <span
                      className={`material-symbols-rounded shrink-0 text-xl text-destiny-orange transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </summary>
                  <div className="px-6 pb-5 text-sm leading-relaxed text-destiny-grey/70">
                    {faq.a}
                  </div>
                </details>
              </AnimateIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
