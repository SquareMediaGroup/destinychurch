import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import MediaEmbed from "@/components/missions/MediaEmbed";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

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
    description:
      "The Moses Project is a registered charitable company which provides guidance, mentoring and support to hundreds of adult males with past and current addictions to drugs and alcohol. The men usually live in chaotic circumstances and are suffering the consequences of long-term self-abuse.\n\nAssistance is given with housing and benefit applications, introduction to positive lifestyles, one-to-one support along with regular team-building events and activities. The Moses Project works closely with all commissioned agencies — Stockton Borough Council Outreach Services, CGL, Probation Services and NHS Mental Health.\n\nBy offering support with life's everyday problems in a caring environment where everyone is welcomed, we provide clients with the opportunity to recover, rebuild their lives and become re-engaged with society.",
    video: {
      src: "https://www.youtube.com/embed/jNtRUpTfCvY",
      title: "The Moses Project",
      thumbnail: "https://i.ytimg.com/vi/jNtRUpTfCvY/maxresdefault.jpg",
    },
    cta: { label: "Visit The Moses Project", href: "https://www.themosesproject.co.uk" },
  },
  {
    id: "compassion",
    name: "Compassion",
    logo: "/img/photos/mission/brand/Compassion.svg",
    whiteLogo: true,
    description:
      "Founded in 1952, Compassion is an international children's charity. We work in 29 countries partnering with 8,600 local churches within communities experiencing poverty. Our heart is to give children and young people the opportunity to thrive and reach their God-given potential both now and into the future.\n\nCompassion's child development programmes are holistic, and because we work in partnership with local churches who know their communities inside out, they're tailored to a child or young person's individual situation. Independent research shows they are highly effective, and now more than 2.3 million children globally are being released from poverty.",
    video: {
      src: "https://www.youtube.com/embed/HE5FDJZkGms",
      title: "Compassion UK",
      thumbnail: "https://i.ytimg.com/vi/HE5FDJZkGms/maxresdefault.jpg",
    },
    cta: { label: "Visit Compassion UK", href: "https://www.compassionuk.org" },
  },
  {
    id: "safe-families",
    name: "Safe Families",
    logo: "/img/photos/mission/brand/safe-families-logo.png",
    description:
      "No one should feel alone. We exist to create relationship and connection because everyone deserves to belong.\n\nSafe Families is a charity that works with 35+ local authorities around the UK, offering hope, belonging and support to children, families and care leavers — primarily, but not exclusively, with and through local churches.\n\nSafe Families' model is flexible, trauma informed and takes a whole family approach to change. We train and support volunteers who provide emotional and practical support, overnight hosting and resources. Volunteers often form long-term relationships with families, improving their social networks.",
    video: {
      src: "https://player.vimeo.com/video/158936662",
      title: "Safe Families",
    },
    cta: { label: "Visit Safe Families", href: "https://safefamilies.uk" },
  },
];

export default function MissionsPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/mission/together-on-mission.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
          <div className="relative flex flex-col items-center justify-center py-48 px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Destiny Church</p>
              <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">Missions</h1>
              <p className="mx-auto max-w-xl text-base text-white/70 md:text-lg">
                Serving the vulnerable. Transforming lives. Reaching the world.
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
              &ldquo;For I was hungry and you gave me food, I was thirsty and you gave me drink,
              I was a stranger and you welcomed me, I was naked and you clothed me&hellip;
              Truly I tell you, whatever you did for one of the least of these brothers
              and sisters of mine, you did for me.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-bold text-destiny-orange">Matthew 25:35–36, 40</p>
          </AnimateIn>
        </div>
      </section>

      {/* Partner logos */}
      <section className="bg-[#f5f7fa] py-14">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-destiny-grey/40">Our Mission Partners</p>
          </AnimateIn>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {partners.map((p) => (
              <AnimateIn key={p.id}>
                <div className={p.whiteLogo ? "rounded-xl bg-destiny-grey px-4 py-2" : ""}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logo} alt={p.name} className="h-10 w-auto object-contain" />
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Partner sections */}
      {partners.map((partner, i) => (
        <section
          key={partner.id}
          id={partner.id}
          className={i % 2 === 0 ? "bg-white py-20" : "bg-[#f5f7fa] py-20"}
        >
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">

              {/* Text */}
              <AnimateIn className={i % 2 !== 0 ? "lg:order-2" : ""}>
                <div className={partner.whiteLogo ? "mb-6 inline-block rounded-xl bg-destiny-grey px-4 py-2" : "mb-6"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={partner.logo} alt={partner.name} className="h-10 w-auto object-contain" />
                </div>
                <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                  {partner.name}
                </h2>
                {partner.description.split("\n\n").map((para, j) => (
                  <p key={j} className="mb-4 text-sm leading-relaxed text-destiny-grey/70">
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

              {/* Video */}
              <AnimateIn delay={100} className={i % 2 !== 0 ? "lg:order-1" : ""}>
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

      {/* Photo strip */}
      <section className="bg-[#f5f7fa] py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { src: "/img/photos/mission/IMG_0125-scaled.jpg", alt: "Missions" },
              { src: "/img/photos/mission/Mission-3.png", alt: "Missions" },
              { src: "/img/photos/mission/Missions-2-scaled.jpg", alt: "Missions" },
            ].map((img, i) => (
              <AnimateIn key={i} delay={i * 60}>
                <div className="overflow-hidden rounded-2xl">
                  <Image src={img.src} alt={img.alt} width={600} height={400} className="w-full object-cover" />
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
