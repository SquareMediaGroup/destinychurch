"use client";

import { useState } from "react";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

const leadTeam = [
  { name: "Faith Harris", role: "Associate Pastor", photo: "/img/brand/Team/FH.png", email: "faith@destinytees.uk" },
  { name: "Tracy Reddy", role: "Small Groups", photo: "/img/brand/Team/TR.png", email: "tracy@destinytees.uk" },
  { name: "Deveshin Reddy", role: "Finance & Facilities", photo: "/img/brand/Team/DR.png", email: "deveshin@destinytees.uk" },
  { name: "Nkereuwem Ekanem", role: "Creativity & Innovation", photo: "/img/brand/Team/NE.png", email: "nk@destinytees.uk" },
];

const departmentHeads = [
  { name: "Funke Awojide", role: "Kids Pastor", photo: "/img/brand/Team/FA.png", email: "funke@destinytees.uk" },
  { name: "Younes Moradi", role: "Stewarding", photo: null, email: "younes@destinytees.uk" },
  { name: "David Bayode", role: "Worship", photo: null, email: "david@destinytees.uk" },
  { name: "Adebowale Awojide", role: "Prayer Team", photo: "/img/brand/Team/Debo.png", email: "debo@destinytees.uk" },
];

const moreDepartmentHeads = [
  { name: "Sarah Thompson", role: "Women's Ministry", photo: null, email: "sarah@destinytees.uk" },
  { name: "James Okonkwo", role: "Men's Ministry", photo: null, email: "james@destinytees.uk" },
  { name: "Mide Ak", role: "Young Adults", photo: null, email: "mide@destinytees.uk" },
  { name: "Daniel Park", role: "Production", photo: null, email: "daniel@destinytees.uk" },
  { name: "Thandi Mathema", role: "Hospitality", photo: null, email: "thandi@destinytees.uk" },
  { name: "Osas Obot", role: "Youth Outreach", photo: null, email: "osas@destinytees.uk" },
  { name: "George Krezner", role: "Administration", photo: null, email: "george@destinytees.uk" },
  { name: "Michael Eze", role: "Discipleship", photo: null, email: "michael@destinytees.uk" },
];

function TeamCard({ name, role, photo, cardBg, email }: { name: string; role: string; photo: string | null; cardBg: string; email: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  return (
    <div className="group flex flex-col items-center text-center">
      <div className="relative mb-3 w-full overflow-hidden rounded-2xl" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.5), transparent), ${cardBg}` }}>
        {photo ? (
          <Image src={photo} alt={name} width={220} height={280} className="w-full object-contain" />
        ) : (
          <div className="flex h-52 items-center justify-center text-3xl font-black text-white/30">
            {initials}
          </div>
        )}
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
      </div>
      <p className="font-bold text-destiny-grey">{name}</p>
      <p className="text-sm text-destiny-grey/50">{role}</p>
    </div>
  );
}

export default function TeamSection() {
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="team" className="bg-[#f5f7fa] py-16">
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
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {departmentHeads.map((member, i) => (
            <AnimateIn key={member.name} delay={i * 80}>
              <TeamCard {...member} cardBg="#475C70" />
            </AnimateIn>
          ))}
        </div>

        {/* Expanded department heads */}
        <div className={`grid grid-cols-2 gap-4 sm:grid-cols-4 transition-all duration-500 overflow-hidden ${showAll ? "mb-6 max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
          {moreDepartmentHeads.map((member, i) => (
            <div key={member.name} style={{ transitionDelay: `${i * 40}ms` }}>
              <TeamCard {...member} cardBg="#475C70" />
            </div>
          ))}
        </div>

        <div className="mb-2 text-center">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center justify-center rounded-full border-2 border-destiny-orange px-8 py-3 text-sm font-bold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
          >
            {showAll ? "View Less" : "View All"}
          </button>
        </div>
      </div>
    </section>
  );
}
