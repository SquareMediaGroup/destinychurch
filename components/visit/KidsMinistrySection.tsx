"use client";

import AnimateIn from "@/components/AnimateIn";
import Image from "next/image";

const ageGroups = [
  {
    title: "Babies & Toddlers",
    age: "0-3 years",
    description: "A safe, nurturing space with toys and activities. Parents are welcome to stay or join the main service."
  },
  {
    title: "Preschool",
    age: "3-5 years",
    description: "Fun, age-appropriate Bible stories, songs, crafts, and games in a caring environment."
  },
  {
    title: "Primary",
    age: "5-11 years",
    description: "Engaging lessons, worship, and activities that help kids discover more about Jesus."
  }
];

export default function KidsMinistrySection() {
  return (
    <section className="bg-gradient-to-br from-destiny-orange to-destiny-orange/80 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/80">
              For Families
            </p>
            <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
              Kids Ministry
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/80">
              We believe church should be a place where the whole family can grow in faith. Our kids ministry provides a safe, fun environment where children can learn about Jesus.
            </p>
          </div>
        </AnimateIn>

        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {ageGroups.map((group, i) => (
            <AnimateIn key={group.title} delay={i * 80}>
              <div className="glass glass-sm rounded-3xl p-6">
                <div className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                  {group.age}
                </div>
                <h3 className="mb-3 text-xl font-black text-white">{group.title}</h3>
                <p className="text-sm leading-relaxed text-white/70">{group.description}</p>
              </div>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn delay={300}>
          <div className="rounded-3xl bg-white p-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="mb-4 text-2xl font-black text-destiny-grey">Safety First</h3>
                <ul className="space-y-3">
                  {[
                    "All volunteers are DBS checked",
                    "Secure check-in and check-out system",
                    "Age-appropriate supervision ratios",
                    "Registered with safeguarding policies"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-destiny-grey/70">
                      <span className="material-symbols-rounded shrink-0 text-base text-destiny-orange">verified</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-2xl font-black text-destiny-grey">First Time?</h3>
                <p className="mb-4 text-sm leading-relaxed text-destiny-grey/60">
                  When you arrive, our welcome team will direct you to our kids check-in area. We&apos;ll get your child registered and show you where their group meets.
                </p>
                <p className="text-sm leading-relaxed text-destiny-grey/60">
                  You&apos;re welcome to stay with younger children until they feel comfortable, and we&apos;ll contact you during the service if needed.
                </p>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
