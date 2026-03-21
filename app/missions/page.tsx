import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import MediaEmbed from "@/components/missions/MediaEmbed";

export const metadata: Metadata = {
  title: "Missions",
  description: "Destiny Church Tees Valley partners with local and global missions — The Moses Project, Compassion, and Safe Families — serving the vulnerable and transforming lives.",
  alternates: { canonical: "/missions" },
  openGraph: {
    title: "Missions | Destiny Church Tees Valley",
    description: "Partnering with The Moses Project, Compassion, and Safe Families to serve the vulnerable and transform lives.",
    url: "https://destinytees.uk/missions",
  },
};

const partners = [
  {
    id: "moses",
    name: "The Moses Project",
    logo: "/img/photos/mission/brand/mosesProject-new.png",
    logoWidth: 180,
    logoHeight: 60,
    description:
      "The Moses Project is a registered charitable company which provides guidance, mentoring and support to hundreds of adult males with past and current addictions to drugs and alcohol. The men usually live in chaotic circumstances and are suffering the consequences of long-term self-abuse.\n\nAssistance is given with housing and benefit applications, introduction to positive lifestyles, one-to-one support along with regular team-building events and activities. The Moses Project works closely with all commissioned agencies — Stockton Borough Council Outreach Services, CGL, Probation Services and NHS Mental Health.\n\nBy offering support with life's everyday problems in a caring environment where everyone is welcomed, we provide clients with the opportunity to recover, rebuild their lives and become re-engaged with society.",
    video: {
      src: "https://www.youtube.com/embed/jNtRUpTfCvY",
      title: "The Moses Project",
      thumbnail: "https://i.ytimg.com/vi/jNtRUpTfCvY/maxresdefault.jpg",
    },
    cta: { label: "Visit The Moses Project", href: "https://www.themosesproject.co.uk" },
    dark: true,
  },
  {
    id: "compassion",
    name: "Compassion",
    logo: "/img/photos/mission/brand/Compassion.svg",
    logoWidth: 180,
    logoHeight: 60,
    description:
      "Founded in 1952, Compassion is an international children's charity. We work in 29 countries partnering with 8,600 local churches within communities experiencing poverty. Our heart is to give children and young people the opportunity to thrive and reach their God-given potential both now and into the future.\n\nCompassion's child development programmes are holistic, and because we work in partnership with local churches who know their communities inside out, they're tailored to a child or young person's individual situation. Independent research shows they are highly effective, and now more than 2.3 million children globally are being released from poverty.",
    video: {
      src: "https://www.youtube.com/embed/HE5FDJZkGms",
      title: "Compassion UK",
      thumbnail: "https://i.ytimg.com/vi/HE5FDJZkGms/maxresdefault.jpg",
    },
    cta: { label: "Visit Compassion UK", href: "https://www.compassionuk.org" },
    dark: false,
  },
  {
    id: "safe-families",
    name: "Safe Families",
    logo: "/img/photos/mission/brand/safe-families-logo.png",
    logoWidth: 180,
    logoHeight: 60,
    description:
      "No one should feel alone. We exist to create relationship and connection because everyone deserves to belong.\n\nSafe Families is a charity that works with 35+ local authorities around the UK, offering hope, belonging and support to children, families and care leavers — primarily, but not exclusively, with and through local churches.\n\nSafe Families' model is flexible, trauma informed and takes a whole family approach to change. We train and support volunteers who provide emotional and practical support, overnight hosting and resources. Volunteers often form long-term relationships with families, improving their social networks.",
    video: {
      src: "https://player.vimeo.com/video/158936662",
      title: "Safe Families",
    },
    cta: { label: "Visit Safe Families", href: "https://safefamilies.uk" },
    dark: true,
  },
];

export default function MissionsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <Image
          src="/img/photos/mission/together-on-mission.png"
          alt="Together on Mission"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

        <div className="relative z-10 px-4 text-center">
          <AnimateIn>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Destiny Church
            </p>
            <h1 className="mb-6 text-6xl font-black uppercase text-white md:text-7xl lg:text-8xl"
              style={{ fontFamily: "var(--font-anton)" }}>
              Missions
            </h1>
          </AnimateIn>
          <AnimateIn delay={100}>
            <blockquote className="mx-auto max-w-2xl">
              <p className="text-lg leading-relaxed text-white/80 md:text-xl">
                &ldquo;For I was hungry and you gave me food, I was thirsty and you gave me drink,
                I was a stranger and you welcomed me, I was naked and you clothed me&hellip;
                Truly I tell you, whatever you did for one of the least of these brothers
                and sisters of mine, you did for me.&rdquo;
              </p>
              <footer className="mt-4 text-sm font-bold text-destiny-orange">
                Matthew 25:35–36, 40
              </footer>
            </blockquote>
          </AnimateIn>
        </div>
      </section>

      {/* Partner logos strip */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
              Our Mission Partners
            </p>
          </AnimateIn>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {partners.map((p) => (
              <AnimateIn key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo} alt={p.name} className="h-12 w-auto object-contain" />
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Partner sections */}
      {partners.map((partner) => (
        <section
          key={partner.id}
          id={partner.id}
          className={partner.dark ? "py-20 text-white" : "bg-[#f5f7fa] py-20"}
          style={partner.dark ? { background: "linear-gradient(135deg, #1c1c1c 0%, #0d0d0d 100%)" } : undefined}
        >
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="grid items-start gap-12 lg:grid-cols-2">

              {/* Left: info */}
              <AnimateIn>
                {/* Logo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className={`mb-6 h-12 w-auto object-contain ${partner.dark ? "brightness-0 invert" : ""}`}
                />

                <h2 className={`mb-5 text-3xl font-black md:text-4xl ${partner.dark ? "text-white" : "text-destiny-grey"}`}>
                  {partner.name}
                </h2>

                {partner.description.split("\n\n").map((para, i) => (
                  <p key={i} className={`mb-4 text-sm leading-relaxed ${partner.dark ? "text-white/70" : "text-destiny-grey/70"}`}>
                    {para}
                  </p>
                ))}

                <Link
                  href={partner.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/20 transition hover:brightness-110"
                >
                  {partner.cta.label}
                  <span className="material-symbols-rounded text-base">open_in_new</span>
                </Link>
              </AnimateIn>

              {/* Right: video */}
              <AnimateIn delay={100}>
                <MediaEmbed
                  src={partner.video.src}
                  title={partner.video.title}
                  thumbnail={partner.video.thumbnail}
                />
              </AnimateIn>

            </div>
          </div>
        </section>
      ))}

      {/* Bottom photos strip */}
      <section className="grid grid-cols-3">
        <div className="relative aspect-video">
          <Image src="/img/photos/mission/IMG_0125-scaled.jpg" alt="" fill className="object-cover" sizes="33vw" />
        </div>
        <div className="relative aspect-video">
          <Image src="/img/photos/mission/Mission-3.png" alt="" fill className="object-cover" sizes="33vw" />
        </div>
        <div className="relative aspect-video">
          <Image src="/img/photos/mission/Missions-2-scaled.jpg" alt="" fill className="object-cover" sizes="33vw" />
        </div>
      </section>
    </>
  );
}
