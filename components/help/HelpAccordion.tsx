"use client";

import { useState } from "react";

interface FAQ {
  q: string;
  a: string;
}

interface Category {
  icon: string;
  label: string;
  color: string;
  faqs: FAQ[];
}

interface Props {
  categories: Category[];
}

export default function HelpAccordion({ categories }: Props) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      {/* Category tabs */}
      <div className="shrink-0 lg:w-56">
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
          {categories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => { setActiveCategory(i); setOpenIndex(null); }}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all lg:w-full ${
                activeCategory === i
                  ? "bg-destiny-orange text-white shadow-sm"
                  : "bg-[#f5f7fa] text-destiny-grey/70 hover:bg-destiny-orange/10 hover:text-destiny-grey"
              }`}
            >
              <span
                className="material-symbols-rounded text-lg"
                style={{ color: activeCategory === i ? "white" : cat.color }}
              >
                {cat.icon}
              </span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ items */}
      <div className="flex-1">
        <div className="space-y-3">
          {categories[activeCategory].faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isOpen
                    ? "border-destiny-orange/20 bg-destiny-orange/5"
                    : "border-transparent bg-[#f5f7fa] hover:border-destiny-orange/10"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-bold text-destiny-grey">{faq.q}</span>
                  <span
                    className={`material-symbols-rounded shrink-0 text-xl text-destiny-orange transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-200 ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-destiny-grey/60">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
