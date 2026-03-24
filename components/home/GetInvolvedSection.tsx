import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

const cards = [
  {
    title: "Get Connected",
    description:
      "Biblical community reflects the very nature of God. We were made and created to belong to a small group of believers who encourage each other, study God's Word together, and support each other in their walk of faith.",
    image: "/img/photos/Prayer1.jpg",
    cta: "Join a Connect Group",
    href: "/connect",
  },
  {
    title: "Join a Team",
    description:
      "You are uniquely gifted to be a blessing to the body of Christ. We'd love to give you the opportunity to use your gifts and talents to serve. Get involved, and together let's express love and build His kingdom.",
    image: "/img/photos/Kids1.png",
    cta: "Join a Team",
    href: "/serve",
  },
];

export default function GetInvolvedSection() {
  return (
    <section className="bg-white pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {cards.map((card, i) => (
            <AnimateIn key={card.title} delay={i * 100}>
              <div className="group overflow-hidden rounded-2xl bg-white shadow-lg">
                {/* Image */}
                <div className="relative h-56 w-full overflow-hidden sm:h-72 md:h-[22.5rem]">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover transition group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                  <h3 className="mb-3 text-xl font-black text-destiny-orange">
                    {card.title}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-destiny-grey/70">
                    {card.description}
                  </p>
                  <Link
                    href={card.href}
                    className="inline-flex items-center justify-center rounded-full border-2 border-destiny-orange px-6 py-2.5 text-sm font-bold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
                  >
                    {card.cta}
                  </Link>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
