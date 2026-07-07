"use client";

import { useState } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

const leadTeam = [
  { name: "Faith Harris", role: "Associate Pastor", photo: "/img/brand/Team/FH.webp", email: "faith@destinytees.uk" },
  { name: "Tracy Reddy", role: "Small Groups", photo: "/img/brand/Team/TR.webp", email: "tracy@destinytees.uk" },
  { name: "Deveshin Reddy", role: "Finance & Facilities", photo: "/img/brand/Team/DR.webp", email: "deveshin@destinytees.uk" },
  { name: "Nkereuwem Ekanem", role: "Creativity & Innovation", photo: "/img/brand/Team/NE.webp", email: "nk@destinytees.uk" },
];

const departmentHeads = [
  { name: "Funke Awojide", role: "Kids Pastor", photo: "/img/brand/Team/FA.webp", email: "funke@destinytees.uk" },
  { name: "Adebowale Awojide", role: "Prayer Team", photo: "/img/brand/Team/Debo.webp", email: "debo@destinytees.uk" },
  { name: "George Krezner", role: "Administration", photo: "/img/brand/Team/GK.webp", email: "george@destinytees.uk" },
  { name: "Younes Moradi", role: "Site & Stewarding", photo: null, email: "younes@destinytees.uk" },
];

const moreDepartmentHeads = [
  { name: "Thandi Mathema", role: "Hospitality & Catering", photo: null, email: null },
  { name: "Nkereuwem Ekanem", role: "Production & IT", photo: null, email: null },
  { name: "David Bayode", role: "Worship Pastor", photo: null, email: null },
  { name: "Neil & Louise Sheekey", role: "Destiny Recovery", photo: null, email: null },
  { name: "Mide Akinyele", role: "Youth Leader (Boys)", photo: null, email: null },
  { name: "Phoebe Smyrell", role: "Youth Leader (Girls)", photo: null, email: null },
];

function TeamCard({ name, role, photo, cardBg, email }: { name: string; role: string; photo: string | null; cardBg: string; email?: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  return (
    <div className="group flex flex-col items-center text-center">
      <div className="relative mb-3 w-full overflow-hidden rounded-2xl" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.5), transparent), ${cardBg}` }}>
        {photo ? (
          <Image src={photo} alt={name} width={220} height={280} className="w-full object-contain" />
        ) : (
          <div className="flex aspect-[320/426] w-full items-center justify-center text-3xl font-black text-white/30">
            {initials}
          </div>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <span className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {email}
            </span>
          </a>
        )}
      </div>
      <p className="font-bold text-destiny-grey">{name}</p>
      <p className="text-sm text-destiny-grey/50">{role}</p>
    </div>
  );
}

export default function TeamSection() {
  const [showMore, setShowMore] = useState(false);

  return (
    <section id="team" className="bg-[#f5f7fa] py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* Lead Team */}
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-orange md:text-4xl">
            Lead Team
          </h2>
        </AnimateIn>
        <div className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {leadTeam.map((member, i) => (
            <AnimateIn key={member.name} delay={i * 80}>
              <TeamCard {...member} cardBg="#FF9E4F" />
            </AnimateIn>
          ))}
        </div>

        {/* Department Heads */}
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-orange md:text-4xl">
            Department Heads
          </h2>
        </AnimateIn>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {departmentHeads.map((member, i) => (
            <AnimateIn key={member.name} delay={i * 80}>
              <TeamCard {...member} cardBg="#475C70" />
            </AnimateIn>
          ))}
        </div>

        {showMore && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {moreDepartmentHeads.map((member, i) => (
              <AnimateIn key={member.name} delay={i * 80}>
                <TeamCard {...member} cardBg="#475C70" />
              </AnimateIn>
            ))}
          </div>
        )}

        <div className="mb-6 mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className="rounded-full border-2 border-destiny-orange px-6 py-2 text-sm font-bold text-destiny-orange transition-colors duration-300 hover:bg-destiny-orange hover:text-white"
          >
            {showMore ? "Show Fewer" : "View All"}
          </button>
        </div>
      </div>
    </section>
  );
}
