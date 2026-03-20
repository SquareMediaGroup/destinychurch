import Image from "next/image";
import Link from "next/link";

const groups = [
  {
    title: "Kids",
    href: "/whats-on#kids",
    image: "/img/photos/kids.jpg",
    description:
      "Destiny Kids is a fun place where children of all ages can learn more about the Bible through games, stories, and singing.",
  },
  {
    title: "Youth",
    href: "/whats-on#youth",
    image: "/img/photos/youth.jpg",
    description:
      "Destiny Youth is vibrant and engaging, ministry with a mission encounter God, build meaningful relationships, and make an impact in their schools and communities.",
  },
  {
    title: "Young Adults",
    href: "/whats-on#young-adults",
    image: "/img/photos/young-adults.jpg",
    description:
      "A vibrant community of young adults worshipping, We seek together to build a deep and authentic relationship with Jesus Christ.",
  },
  {
    title: "Connect Groups",
    href: "/connect",
    image: "/img/photos/connect-groups.jpg",
    description:
      "Our Connect Groups are an integral part of the life and health of the church. Together in a small group believers are effective, powerful and fruitful witnesses in the world.",
  },
];

export default function EveryoneHasAPlaceSection() {
  return (
    <section className="bg-[#1a1108] py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="mb-10 text-center text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          Everyone Has A Place
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <Link
              key={group.title}
              href={group.href}
              className="group overflow-hidden rounded-2xl bg-[#2c1a0e] shadow-lg transition hover:shadow-xl"
            >
              {/* Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={group.image}
                  alt={group.title}
                  fill
                  className="object-cover transition group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <h3 className="absolute bottom-3 left-4 text-xl font-black uppercase text-white">
                  {group.title}
                </h3>
              </div>

              {/* Description */}
              <div className="p-4">
                <p className="text-sm leading-relaxed text-white/60 line-clamp-3">
                  {group.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
