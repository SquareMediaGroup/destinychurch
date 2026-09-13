"use client";

import AnimateIn from "@/components/AnimateIn";
import Link from "next/link";

const expectations = [
  {
    icon: "waving_hand",
    title: "A Warm Welcome",
    description: "Our welcome team will greet you at the door and help you find your way around. Feel free to ask any questions."
  },
  {
    icon: "music_note",
    title: "Worship & Music",
    description: "We sing contemporary worship songs together. You can sing along, or just listen and soak it in."
  },
  {
    icon: "menu_book",
    title: "Bible Teaching",
    description: "Our pastors share practical, relevant messages from the Bible that apply to everyday life."
  },
  {
    icon: "diversity_3",
    title: "Friendly Atmosphere",
    description: "Come as you are. Whether it's jeans or a suit, you'll fit right in. We're a relaxed, welcoming community."
  },
  {
    icon: "coffee",
    title: "Coffee & Connection",
    description: "Before and after the service, enjoy free refreshments and the chance to meet new people."
  },
  {
    icon: "schedule",
    title: "About 90 Minutes",
    description: "Our service typically lasts around 90 minutes, including worship, teaching, and prayer."
  }
];

export default function WhatToExpectSection() {
  return (
    <section className="bg-[#f5f7fa] py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              First Time Here?
            </p>
            <h2 className="mb-4 text-4xl font-black text-destiny-grey md:text-5xl">
              What to Expect
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              We know visiting a new church can feel a bit daunting. Here&apos;s what a typical Sunday looks like.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {expectations.map((item, i) => (
            <AnimateIn key={item.title} delay={i * 60}>
              <div className="flex flex-col rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-3xl text-destiny-orange">{item.icon}</span>
                </div>
                <h3 className="mb-2 text-lg font-black text-destiny-grey">{item.title}</h3>
                <p className="text-sm leading-relaxed text-destiny-grey/60">{item.description}</p>
              </div>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn delay={400}>
          <div className="mt-12 rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-base font-bold text-destiny-grey">
              Have questions before you visit?
            </p>
            <p className="mx-auto mb-6 mt-2 max-w-xl text-sm leading-relaxed text-destiny-grey/60">
              We&apos;d love to hear from you. Get in touch and we&apos;ll do our best to help.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              <span className="material-symbols-rounded text-base">mail</span>
              Contact Us
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
