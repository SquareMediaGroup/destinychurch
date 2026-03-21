import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

const groups = [
  {
    title: "Kids",
    href: "/whats-on#kids",
    image: "/img/photos/Kids2.jpg",
    description:
      "Destiny Kids is a fun place where children of all ages can learn more about the Bible through games, stories, and singing.",
  },
  {
    title: "Youth",
    href: "/whats-on#youth",
    image: "/img/photos/Youth1.JPG",
    description:
      "Destiny Youth is vibrant and engaging, ministry with a mission encounter God, build meaningful relationships, and make an impact in their schools and communities.",
  },
  {
    title: "Young Adults",
    href: "/whats-on#young-adults",
    image: "/img/photos/YA1.jpg",
    description:
      "A vibrant community of young adults worshipping, We seek together to build a deep and authentic relationship with Jesus Christ.",
  },
  {
    title: "Connect Groups",
    href: "/connect",
    image: "/img/photos/ConnectGroups.jpg",
    description:
      "Our Connect Groups are an integral part of the life and health of the church. Together in a small group believers are effective, powerful and fruitful witnesses in the world.",
  },
];

export default function EveryoneHasAPlaceSection() {
  return (
    <section className="bg-[#1a1108] py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
            Everyone Has A Place
          </h2>
        </AnimateIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group, i) => (
            <AnimateIn key={group.title} delay={i * 80}>
              <Link
                href={group.href}
                className="group relative block h-80 overflow-hidden rounded-2xl shadow-lg"
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

                {/* Text */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-xl font-black uppercase text-white">
                    {group.title}
                  </h3>
                  <p className="mt-2 max-h-0 overflow-hidden text-sm leading-relaxed text-white/80 transition-all duration-500 group-hover:max-h-40">
                    {group.description}
                  </p>
                </div>
              </Link>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
