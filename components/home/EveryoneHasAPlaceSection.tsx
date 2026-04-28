import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

type Group = {
  title: string;
  href: string;
  image: string;
  cutout: string | null;
  cutoutAlt: string | null;
  cutoutOffsetX: string;
  description: string;
};

const groups: Group[] = [
  {
    title: "Kids",
    href: "/kids",
    image: "/img/photos/Kids2.jpg",
    cutout: "/img/TransparentBackgroundImages/ParentChild.webp",
    cutoutAlt: "A parent holding a child",
    cutoutOffsetX: "-4%",
    description:
      "Destiny Kids is a fun place where children of all ages can learn more about the Bible through games, stories, and singing.",
  },
  {
    title: "Youth",
    href: "/youth",
    image: "/img/photos/Youth1.JPG",
    cutout: "/img/TransparentBackgroundImages/Youth.webp",
    cutoutAlt: "A group of young people gathered together",
    cutoutOffsetX: "2%",
    description:
      "Destiny Youth is vibrant and engaging, ministry with a mission encounter God, build meaningful relationships, and make an impact in their schools and communities.",
  },
  {
    title: "Young Adults",
    href: "/young-adults",
    image: "/img/photos/YA1.jpg",
    cutout: "/img/TransparentBackgroundImages/YA.webp",
    cutoutAlt: "Two young adults laughing together",
    cutoutOffsetX: "-2%",
    description:
      "A vibrant community of young adults worshipping, We seek together to build a deep and authentic relationship with Jesus Christ.",
  },
  {
    title: "Connect Groups",
    href: "/connect",
    image: "/img/photos/ConnectGroups.jpg",
    cutout: null,
    cutoutAlt: null,
    cutoutOffsetX: "0%",
    description:
      "Our Connect Groups are an integral part of the life and health of the church. Together in a small group believers are effective, powerful and fruitful witnesses in the world.",
  },
];

export default function EveryoneHasAPlaceSection() {
  return (
    <section className="bg-[#1a1108] py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-6 text-center text-2xl font-black uppercase tracking-tight text-white sm:mb-10 sm:text-3xl md:text-4xl">
            Everyone Has A Place
          </h2>
        </AnimateIn>

        {/* Extra top padding so cutouts have room to rise above each card */}
        <div className="grid gap-6 pt-40 sm:grid-cols-2 sm:pt-48 lg:grid-cols-4 lg:pt-52">
          {groups.map((group, i) => (
            <AnimateIn key={group.title} delay={i * 80}>
              <Link
                href={group.href}
                className="group relative block h-56 rounded-2xl shadow-lg sm:h-72 lg:h-80"
              >
                {/* Cutout — sits above the card, breaking out the top */}
                {group.cutout && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 z-20 h-[220px] w-[130%] -translate-x-1/2 sm:h-[260px] lg:h-[290px]"
                    style={{
                      bottom: "calc(100% - 60px)",
                      transform: `translateX(calc(-50% + ${group.cutoutOffsetX}))`,
                    }}
                  >
                    <div className="relative h-full w-full transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.04]">
                      <Image
                        src={group.cutout}
                        alt={group.cutoutAlt ?? group.title}
                        fill
                        sizes="(max-width: 640px) 130vw, (max-width: 1024px) 65vw, 33vw"
                        className="object-contain object-bottom drop-shadow-[0_18px_18px_rgba(0,0,0,0.55)]"
                      />
                    </div>
                  </div>
                )}

                {/* Card — same as before, just clipped via inner wrapper so cutout can overflow */}
                <div className="relative h-full w-full overflow-hidden rounded-2xl">
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
                </div>
              </Link>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
