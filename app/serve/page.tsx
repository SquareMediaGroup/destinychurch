import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

const ministries = [
  {
    name: "Worship",
    icon: "music_note",
    color: "#F58021",
    lead: "David Bayode",
    description: "Lead the church in encountering God through music, song and creative expression. Singers, musicians and sound engineers all welcome.",
  },
  {
    name: "Destiny Kids",
    icon: "child_care",
    color: "#0857BA",
    lead: "Funke Awojide",
    description: "Help children aged 0–11 discover God in a fun, safe and nurturing environment. Teaching, craft, games and pastoral care for little ones.",
  },
  {
    name: "Destiny Youth",
    icon: "bolt",
    color: "#8106B1",
    lead: "Osas Obot",
    description: "Invest in the next generation. Walk alongside young people aged 11–18 as they explore faith, identity and purpose.",
  },
  {
    name: "Stewarding & Welcome",
    icon: "waving_hand",
    color: "#F58021",
    lead: "Younes Moradi",
    description: "Be the first face people see. Our Welcome Team creates a warm, safe and welcoming environment every Sunday and at events.",
  },
  {
    name: "Prayer Team",
    icon: "volunteer_activism",
    color: "#FD0000",
    lead: "Adebowale Awojide",
    description: "Pray with and for the congregation during services and beyond. A vital ministry underpinning everything we do at Destiny.",
  },
  {
    name: "Connect Groups",
    icon: "diversity_3",
    color: "#0857BA",
    lead: "Tracy Reddy",
    description: "Host or lead a small group where people can grow in faith, build friendships and do life together throughout the week.",
  },
  {
    name: "Hospitality",
    icon: "local_cafe",
    color: "#028002",
    lead: "Thandi Mathema",
    description: "Serve teas, coffees and refreshments, making every guest feel genuinely welcome and at home from the moment they walk through the door.",
  },
  {
    name: "Production & Media",
    icon: "videocam",
    color: "#363f48",
    lead: "Daniel Park",
    description: "Run sound, lighting, screens and video. Help bring the Sunday experience to life both in the building and online for those watching at home.",
  },
  {
    name: "Media",
    icon: "palette",
    color: "#8106B1",
    lead: "Daniel Park",
    description: "Design graphics, create content and shape the visual identity of Destiny Church. If you're creative, we'd love to have you on this team.",
  },
  {
    name: "Outreach & Missions",
    icon: "public",
    color: "#028002",
    lead: "Nkereuwem Ekanem",
    description: "Take the love of God beyond the church walls — locally, nationally and internationally. Get involved in outreach events and mission trips.",
  },
  {
    name: "Discipleship",
    icon: "menu_book",
    color: "#8106B1",
    lead: "Michael Eze",
    description: "Help people grow in their faith through Bible study, one-to-one mentoring and structured discipleship programmes.",
  },
  {
    name: "Administration",
    icon: "admin_panel_settings",
    color: "#363f48",
    lead: "George Krezner",
    description: "Keep Destiny running smoothly behind the scenes. If you're organised, detail-oriented and love serving practically, this team needs you.",
  },
];

export default function ServePage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/Training_DC-scaled.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Get Involved</p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">Serve</h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                You were made for more than just attending. Find your place on the team.
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Scripture */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <blockquote className="text-xl font-medium italic leading-relaxed text-destiny-grey md:text-2xl">
              &ldquo;For we are God&apos;s handiwork, created in Christ Jesus to do good works,
              which God prepared in advance for us to do.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-bold text-destiny-orange">Ephesians 2:10</p>
          </AnimateIn>
        </div>
      </section>

      {/* Why serve */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Why Serve?</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                You have something to offer
              </h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Serving isn&apos;t just about filling a rota — it&apos;s one of the most powerful ways to grow in your own faith. When you use your gifts to serve others, you step into the purpose God has placed in you.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                Whether you love music, working with children, tech, admin or just making people feel welcome — there is a team at Destiny where you belong and where your contribution genuinely matters.
              </p>
            </AnimateIn>
            <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="col-span-2 overflow-hidden rounded-3xl">
                <Image src="/img/photos/Training_DC-scaled.jpg" alt="Serving at Destiny" width={640} height={280} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/WorshipMoment1.jpg" alt="" width={300} height={200} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Community.webp" alt="" width={300} height={200} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Ministries */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">Our Ministries</h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">Find the team that fits your gifts and passions</p>
          </AnimateIn>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ministries.map((m, i) => (
              <AnimateIn key={m.name} delay={(i % 4) * 60}>
                <div className="flex h-full flex-col rounded-3xl border border-black/5 bg-[#f5f7fa] p-6">
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: m.color + "18" }}
                  >
                    <span className="material-symbols-rounded text-2xl" style={{ color: m.color }}>{m.icon}</span>
                  </div>
                  <h3 className="mb-3 font-black text-destiny-grey">{m.name}</h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{m.description}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Sign up form */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">Ready to Join a Team?</p>
            <h2 className="mb-3 text-center text-3xl font-black text-white md:text-4xl">Get Involved</h2>
            <p className="mb-10 text-center text-base text-white/60">
              Fill in the form below and we&apos;ll be in touch to find the best fit for you.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              <iframe
                src="https://destinytees.churchsuite.com/-/forms/cdgkeqkm"
                className="w-full"
                style={{ height: 800, border: "none" }}
                title="Serve sign up form"
                loading="lazy"
              />
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Photo strip */}
      <section className="bg-[#f5f7fa] py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              "/img/photos/WorshipMoment1.jpg",
              "/img/photos/WorshipMoment2.jpg",
              "/img/photos/Community.webp",
              "/img/photos/ConnectGroups.jpg",
            ].map((src, i) => (
              <AnimateIn key={i} delay={i * 60}>
                <div className="aspect-square overflow-hidden rounded-2xl">
                  <Image src={src} alt="" width={300} height={300} className="h-full w-full object-cover" />
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
