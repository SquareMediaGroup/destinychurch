"use client";

import Image from "next/image";
import { useState } from "react";
import AnimateIn from "@/components/AnimateIn";

type Category = "All" | "Worship & Arts" | "Kids & Youth" | "Community" | "Outreach" | "Behind the Scenes";

type Ministry = {
  name: string;
  icon: string;
  color: string;
  lead: string;
  tagline: string;
  description: string;
  detail: string;
  photos: string[];
  requirements?: string[];
  category: Category;
};

const CATEGORIES: Category[] = ["All", "Worship & Arts", "Kids & Youth", "Community", "Outreach", "Behind the Scenes"];

const ministries: Ministry[] = [
  {
    name: "Worship",
    icon: "music_note",
    color: "#F58021",
    lead: "David Bayode",
    tagline: "Singers, musicians & sound engineers",
    description:
      "Lead the church in encountering God through music, song and creative expression. Singers, musicians and sound engineers all welcome.",
    detail:
      "The Worship team leads the church into the presence of God every Sunday and at special events. We're a community of singers, musicians, and sound engineers who are as passionate about spiritual depth as we are about musical excellence. We rehearse weekly and invest in one another's growth — both on stage and off it. If you play an instrument, have a voice, or love running sound and mix, we'd love to hear from you.",
    photos: [
      "/img/photos/Gallery/WorshipMoment.jpeg",
      "/img/photos/Gallery/SingingLand.jpeg",
      "/img/photos/Gallery/SingingPort.jpeg",
      "/img/photos/Gallery/SingingLand3.jpeg",
    ],
    requirements: [
      "Ability to play an instrument or sing to a reasonable standard",
      "Commitment to weekly rehearsals",
      "Active member of Destiny Church",
    ],
    category: "Worship & Arts",
  },
  {
    name: "Destiny Kids",
    icon: "child_care",
    color: "#F58021",
    lead: "Funke Awojide",
    tagline: "Ages 0–11 · Teaching, games & care",
    description:
      "Help children aged 0–11 discover God in a fun, safe and nurturing environment. Teaching, craft, games and pastoral care for little ones.",
    detail:
      "Destiny Kids is where the next generation first encounters Jesus. We run vibrant, safe, and age-appropriate sessions for children aged 0–11 every Sunday. Volunteers get involved in storytelling, crafts, games, check-in, and one-to-one care. No special qualifications needed — just a love for kids and a heart to serve. All volunteers are DBS checked.",
    photos: [
      "/img/photos/Kids1.png",
      "/img/photos/Kids2.jpg",
      "/img/photos/Gallery/FamilySatTogether.jpeg",
    ],
    requirements: [
      "Enhanced DBS check (we'll help arrange this)",
      "Completed Safeguarding training",
      "Active member of Destiny Church",
    ],
    category: "Kids & Youth",
  },
  {
    name: "Destiny Youth",
    icon: "bolt",
    color: "#F58021",
    lead: "Osas Obot",
    tagline: "Ages 11–18 · Faith, identity & purpose",
    description:
      "Invest in the next generation. Walk alongside young people aged 11–18 as they explore faith, identity and purpose.",
    detail:
      "Destiny Youth is a space where teenagers can be themselves, ask hard questions, and encounter a God who knows them by name. The team runs Sunday sessions and regular youth events, creating environments that are energetic, honest, and rooted in the Word. If you have a heart for young people and remember what it felt like to be a teenager navigating life and faith, this team is for you.",
    photos: [
      "/img/photos/Gallery/YouthCommunity.jpeg",
      "/img/photos/YA1.jpg",
      "/img/photos/Youth1.JPG",
    ],
    requirements: [
      "Enhanced DBS check (we'll help arrange this)",
      "Completed Safeguarding training",
      "Active member of Destiny Church",
      "Heart for young people aged 11–18",
    ],
    category: "Kids & Youth",
  },
  {
    name: "Stewarding & Welcome",
    icon: "waving_hand",
    color: "#F58021",
    lead: "Younes Moradi",
    tagline: "First impressions · Warm & safe spaces",
    description:
      "Be the first face people see. Our Welcome Team creates a warm, safe and welcoming environment every Sunday and at events.",
    detail:
      "The Welcome Team is the heartbeat of Sunday hospitality. You're the first face a guest sees when they walk through the door, and that moment matters more than you know. From greeting and directing to ensuring safety and accessibility, this team makes sure every single person — whether it's their first Sunday or their hundredth — feels genuinely seen and welcomed.",
    photos: [
      "/img/photos/Gallery/Community.jpeg",
      "/img/photos/Gallery/Community2.jpeg",
      "/img/photos/Gallery/OlderPeople.jpeg",
    ],
    category: "Community",
  },
  {
    name: "Prayer Team",
    icon: "volunteer_activism",
    color: "#F58021",
    lead: "Adebowale Awojide",
    tagline: "Intercession · Ministry · Prayer ministry",
    description:
      "Pray with and for the congregation during services and beyond. A vital ministry underpinning everything we do at Destiny.",
    detail:
      "Prayer is the engine room of everything at Destiny. The Prayer Team ministers to individuals during and after services, intercedes for the church and the city, and helps build a culture where encountering God is the norm. If you feel called to a ministry of prayer and want to serve the church in one of the most impactful ways possible, this team is waiting for you.",
    photos: [
      "/img/photos/Prayer1.jpg",
      "/img/photos/Gallery/Speaker.jpeg",
      "/img/photos/Gallery/Speaker2.jpeg",
    ],
    category: "Community",
  },
  {
    name: "Connect Groups",
    icon: "diversity_3",
    color: "#F58021",
    lead: "Tracy Reddy",
    tagline: "Small groups · Mid-week community",
    description:
      "Host or lead a small group where people can grow in faith, build friendships and do life together throughout the week.",
    detail:
      "Connect Groups are where real community happens. These small groups of 8–12 people meet mid-week in homes across Teesside to study the Word, pray together, and do life. As a Connect Group leader or host, you create the space for people to belong, grow and be known. Training and ongoing support are provided for all leaders.",
    photos: [
      "/img/photos/ConnectGroups.jpg",
      "/img/photos/Gallery/Community2.jpeg",
      "/img/photos/Gallery/FamilySatTogether.jpeg",
    ],
    category: "Community",
  },
  {
    name: "Hospitality",
    icon: "local_cafe",
    color: "#F58021",
    lead: "Thandi Mathema",
    tagline: "Teas, coffees & a warm welcome",
    description:
      "Serve teas, coffees and refreshments, making every guest feel genuinely welcome and at home from the moment they walk through the door.",
    detail:
      "There is theology in a warm cup of coffee. The Hospitality team serves refreshments before and after every Sunday service, creating a relaxed atmosphere where conversations happen and friendships form. It might sound simple, but this team plays a crucial role in making Destiny feel like home. If you love people and don't mind getting behind a counter, we'd love you on the team.",
    photos: [
      "/img/photos/Gallery/Community.jpeg",
      "/img/photos/Gallery/OlderPeople.jpeg",
      "/img/photos/Gallery/FamilySatTogether.jpeg",
    ],
    category: "Community",
  },
  {
    name: "Production",
    icon: "videocam",
    color: "#F58021",
    lead: "Daniel Park",
    tagline: "Sound · Lighting · Screens · Livestream",
    description:
      "Run sound, lighting, screens and video. Help bring the Sunday experience to life both in the building and online for those watching at home.",
    detail:
      "The Production team is the technical backbone of every Sunday service and event. From running front-of-house sound and lighting rigs to managing the screens and livestreaming for those watching at home, this is a team for people who love tech and want to use it for something that matters. Training is available — passion for excellence and a teachable spirit are all you need.",
    photos: [
      "/img/photos/Gallery/WorshipMoment3.jpeg",
      "/img/photos/Gallery/SingingLand2.jpeg",
      "/img/photos/Gallery/SingingLand4.jpeg",
    ],
    requirements: [
      "Basic understanding of sound, lighting, or video (training available)",
      "Reliable and punctual — Sundays require early setup",
      "Willingness to learn and serve consistently",
    ],
    category: "Behind the Scenes",
  },
  {
    name: "Social Media & Photography",
    icon: "palette",
    color: "#F58021",
    lead: "Daniel Park",
    tagline: "Design · Content · Photography",
    description:
      "Design graphics, capture moments and shape the visual identity of Destiny Church across social media and beyond.",
    detail:
      "The Social Media & Photography team tells the story of Destiny to the world. From Sunday morning photos and Reels to week-to-week graphics and campaign visuals, this team shapes how the church looks and sounds online. If you're a photographer, videographer, graphic designer, or content creator — or you just have a good eye and want to learn — there's a role for you here.",
    photos: [
      "/img/photos/Gallery/Photography.jpeg",
      "/img/photos/Gallery/WorshipMoment.jpeg",
      "/img/photos/Gallery/Speaker2.jpeg",
    ],
    requirements: [
      "Experience or genuine interest in photography, videography, or graphic design",
      "Own equipment helpful but not required",
      "Comfortable using social media platforms",
    ],
    category: "Worship & Arts",
  },
  {
    name: "Outreach & Missions",
    icon: "public",
    color: "#F58021",
    lead: "Nkereuwem Ekanem",
    tagline: "Local · National · International",
    description:
      "Take the love of God beyond the church walls — locally, nationally and internationally. Get involved in outreach events and mission trips.",
    detail:
      "Outreach & Missions is about taking the Gospel beyond our four walls. The team organises local community initiatives, partners with national organisations, and sends teams on international mission trips. Whether you want to hand out food in Middlesbrough or fly to a partner church overseas, this team will give you the opportunity to be the hands and feet of Jesus in a very real way.",
    photos: [
      "/img/photos/Gallery/Community.jpeg",
      "/img/photos/Gallery/OlderPeople.jpeg",
      "/img/photos/Community.webp",
    ],
    category: "Outreach",
  },
  {
    name: "Administration",
    icon: "admin_panel_settings",
    color: "#F58021",
    lead: "George Krezner",
    tagline: "Organisation · Operations · Planning",
    description:
      "Keep Destiny running smoothly behind the scenes. If you're organised, detail-oriented and love serving practically, this team needs you.",
    detail:
      "The Administration team keeps the engine of Destiny Church running. From communications and scheduling to event logistics and financial administration, this is a team for people who love order, precision and making things happen. If you're organised, reliable and enjoy serving in ways that others often don't see — this is one of the most valuable roles in the church.",
    photos: [
      "/img/photos/Gallery/Community2.jpeg",
      "/img/photos/Gallery/FamilySatTogether.jpeg",
    ],
    category: "Behind the Scenes",
  },
  {
    name: "Decoration",
    icon: "brush",
    color: "#F58021",
    lead: "",
    tagline: "Stage design · Seasonal décor · Atmosphere",
    description:
      "Help create beautiful spaces that welcome people and reflect the heart of Destiny — from Sunday stage design to seasonal installations.",
    detail:
      "The Decoration team transforms the physical space of Destiny Church into an environment that speaks before a word is even said. From Sunday stage setups and seasonal displays to special events and creative installations, this team uses artistic gifts to create atmosphere. If you have an eye for design, a creative streak, or simply love making spaces feel special, come and join us.",
    photos: [
      "/img/photos/Gallery/WorshipMoment3.jpeg",
      "/img/photos/Gallery/SingingLand4.jpeg",
    ],
    category: "Worship & Arts",
  },
  {
    name: "Building Maintenance",
    icon: "handyman",
    color: "#F58021",
    lead: "",
    tagline: "Cleaning · DIY · Facilities care",
    description:
      "Help keep our building clean, well-maintained and ready for every service and event. Practical skills of every kind welcome.",
    detail:
      "The Building Maintenance team ensures that Destiny's home is always clean, safe and well-kept. From regular cleaning rotas and DIY repairs to post-event tidy-ups and facility improvements, this is a hands-on team for people who love practical service. No specialist skills required — just a willingness to roll up your sleeves and take care of what God has given us.",
    photos: [
      "/img/photos/Gallery/Community.jpeg",
      "/img/photos/Gallery/FamilySatTogether.jpeg",
    ],
    category: "Behind the Scenes",
  },
  {
    name: "Alpha",
    icon: "lightbulb",
    color: "#F58021",
    lead: "",
    tagline: "Hosting · Discussion · Welcoming seekers",
    description:
      "Help run Alpha — a relaxed series of conversations exploring the big questions of life and faith, open to anyone and everyone.",
    detail:
      "Alpha is one of the most powerful evangelism tools in the church — a series of sessions that create a safe space for anyone to explore Christianity, no matter where they're starting from. The Alpha team helps with hosting, cooking, leading small group discussions, and praying for guests. If you have a heart for people who are searching, and want to play a part in their journey to faith, this is a team you'll love.",
    photos: [
      "/img/photos/Gallery/Community2.jpeg",
      "/img/photos/Gallery/OlderPeople.jpeg",
      "/img/photos/Gallery/FamilySatTogether.jpeg",
    ],
    category: "Outreach",
  },
];

export default function MinistriesGrid() {
  const [active, setActive] = useState<Ministry | null>(null);
  const [filter, setFilter] = useState<Category>("All");
  const [displayedFilter, setDisplayedFilter] = useState<Category>("All");
  const [fading, setFading] = useState(false);

  function handleFilter(cat: Category) {
    if (cat === filter) return;
    setFading(true);
    setTimeout(() => {
      setFilter(cat);
      setDisplayedFilter(cat);
      setFading(false);
    }, 200);
  }

  const visible = displayedFilter === "All" ? ministries : ministries.filter((m) => m.category === displayedFilter);

  return (
    <>
      {/* Filter pills */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleFilter(cat)}
            className="rounded-full border-2 px-5 py-2 text-sm font-bold transition duration-200"
            style={
              filter === cat
                ? { borderColor: "#F58021", background: "#F58021", color: "#fff" }
                : { borderColor: "#F5802133", background: "transparent", color: "#363f48" }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div
        className={`transition-all duration-200 ${fading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"} ${
          displayedFilter === "All"
            ? "grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "flex flex-wrap justify-center gap-4"
        }`}
      >
        {visible.map((m, i) => (
          <AnimateIn key={m.name} delay={fading ? 0 : (i % 4) * 60} className={displayedFilter === "All" ? "h-full" : "h-full w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] xl:w-[calc(25%-0.75rem)]"}>
            <button
              onClick={() => setActive(m)}
              className="group flex h-full w-full flex-col items-center rounded-3xl bg-white p-8 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10 transition group-hover:bg-destiny-orange/20">
                <span className="material-symbols-rounded text-4xl text-destiny-orange">{m.icon}</span>
              </div>
              <h3 className="mb-2 text-xl font-black text-destiny-grey">{m.name}</h3>
              <p className="text-sm leading-relaxed text-destiny-grey/60">{m.description}</p>
            </button>
          </AnimateIn>
        ))}
      </div>

      {/* Modal */}
      {active && (
        <MinistryModal ministry={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}

function PhotoSlideshow({ photos, color }: { photos: string[]; color: string }) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return null;
  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      <Image
        key={photos[index]}
        src={photos[index]}
        alt=""
        fill
        className="object-cover transition-opacity duration-300"
        sizes="(max-width: 640px) 100vw, 672px"
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Previous photo"
          >
            <span className="material-symbols-rounded text-[1.1rem]">chevron_left</span>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Next photo"
          >
            <span className="material-symbols-rounded text-[1.1rem]">chevron_right</span>
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === index ? "1.5rem" : "0.375rem",
                  background: i === index ? color : "rgba(255,255,255,0.5)",
                }}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MinistryModal({
  ministry: m,
  onClose,
}: {
  ministry: Ministry;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={m.name}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="animate-slide-up relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl sm:shadow-2xl">
        {/* Coloured bar */}
        <div className="h-1 w-full shrink-0" style={{ background: m.color }} />

        {/* Scrollable body */}
        <div className="overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-4 px-6 pt-6 pb-4">
            <div className="flex-1">
              <h2 className="text-xl font-black text-destiny-grey">{m.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-destiny-grey/50 transition hover:bg-black/10"
              aria-label="Close"
            >
              <span className="material-symbols-rounded text-[1.2rem]">close</span>
            </button>
          </div>

          {/* Photos slideshow */}
          {m.photos.length > 0 && (
            <div className="pb-5">
              <PhotoSlideshow photos={m.photos} color={m.color} />
            </div>
          )}

          {/* Description */}
          <div className="px-6 pb-4">
            <p className="text-sm leading-relaxed text-destiny-grey/70">
              {m.detail}
            </p>
          </div>

          {/* Requirements */}
          {m.requirements && m.requirements.length > 0 && (
            <div className="mx-6 mb-6 rounded-2xl bg-[#f5f7fa] p-4">
              <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-widest text-destiny-grey/40">
                Requirements
              </p>
              <ul className="space-y-2">
                {m.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[0.82rem] text-destiny-grey/70">
                    <span
                      className="material-symbols-rounded mt-0.5 shrink-0 text-[0.95rem]"
                      style={{ color: m.color }}
                    >
                      check_circle
                    </span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="px-6 pb-8">
            <a
              href="#get-involved"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-full py-3 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: m.color }}
            >
              Get Involved
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
