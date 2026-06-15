import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

const groups = [
  {
    title: "Kids",
    href: "/kids",
    image: "/img/photos/Kids2.webp",
    accent: "#028002",
    description:
      "Destiny Kids is a fun place where children of all ages can learn more about the Bible through games, stories, and singing.",
  },
  {
    title: "Youth",
    href: "/youth",
    image: "/img/photos/EHAP_Youth.webp",
    accent: "#0857ba",
    description:
      "Destiny Youth is vibrant and engaging, ministry with a mission encounter God, build meaningful relationships, and make an impact in their schools and communities.",
  },
  {
    title: "Young Adults",
    href: "/young-adults",
    image: "/img/photos/YA1.webp",
    accent: "#f58021",
    description:
      "A vibrant community of young adults worshipping, We seek together to build a deep and authentic relationship with Jesus Christ.",
  },
  {
    title: "Connect Groups",
    href: "/connect",
    image: "/img/photos/ConnectGroups.webp",
    accent: "#8106b1",
    description:
      "Our Connect Groups are an integral part of the life and health of the church. Together in a small group believers are effective, powerful and fruitful witnesses in the world.",
  },
];

export default function EveryoneHasAPlaceSection() {
  return (
    <section className="bg-[#1a1108] py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-3 text-center text-2xl font-black uppercase tracking-tight text-white sm:mb-4 sm:text-3xl md:text-4xl">
            Everyone Has A Place
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-base leading-relaxed text-white/70 sm:mb-12 sm:text-lg">
            Wherever you are in life, there&rsquo;s a community here for you.
          </p>
        </AnimateIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group, i) => (
            <AnimateIn key={group.title} delay={i * 80}>
              <Link
                href={group.href}
                style={{ "--accent": group.accent } as React.CSSProperties}
                className="group relative block h-56 overflow-hidden rounded-2xl shadow-lg transition-shadow duration-300 group-hover:shadow-xl sm:h-72 lg:h-80"
              >
                <Image
                  src={group.image}
                  alt={group.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {/* Base gradient — always visible */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                {/* Hover gradient — strengthens on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {/* Brand-color glow — warms the bottom on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent)] to-transparent opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-30" />

                {/* Text */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  {/* Accent bar — per-group color identity, fading gradient */}
                  <span className="mb-3 block h-1 w-12 rounded-full bg-gradient-to-r from-[var(--accent)] to-transparent opacity-80 transition-all duration-300 group-hover:w-20" />
                  <h3 className="text-xl font-black uppercase text-white">
                    {group.title}
                  </h3>
                  <p className="mt-2 max-h-0 overflow-hidden text-sm leading-relaxed text-white/80 transition-all duration-500 group-hover:max-h-40">
                    {group.description}
                  </p>
                  <span className="mt-3 flex translate-y-1 items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--accent)] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Explore
                    <span aria-hidden="true">&rarr;</span>
                  </span>
                </div>
              </Link>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
