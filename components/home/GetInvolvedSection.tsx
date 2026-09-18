import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import Card from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";

const cards = [
  {
    title: "Get Connected",
    description:
      "Biblical community reflects the very nature of God. We were made and created to belong to a small group of believers who encourage each other, study God's Word together, and support each other in their walk of faith.",
    image: "/img/photos/Prayer1.webp",
    cta: "Join a Connect Group",
    href: "/connect",
  },
  {
    title: "Join a Team",
    description:
      "You are uniquely gifted to be a blessing to the body of Christ. We'd love to give you the opportunity to use your gifts and talents to serve. Get involved, and together let's express love and build His kingdom.",
    image: "/img/photos/Training_DC-scaled.webp",
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
              {/*
                The whole card is the link now, not just the pill at the
                bottom. The image already scaled on `group-hover` across the
                card's full surface — it read as one big tappable area, but
                only the ~180px pill actually was, which was the worst tap
                target on the homepage on a phone.

                The pill inside stays purely visual (a <span>, not a second
                <Link>): both destinations are the card's own href, so there is
                nothing for a second interactive element to do that the card
                doesn't already do, and a link nested in a link is invalid
                HTML regardless.
              */}
              <Card href={card.href} interactive className="group overflow-hidden bg-white">
                <div className="relative h-56 w-full overflow-hidden sm:h-72 md:h-[22.5rem]">
                  <Image
                    src={card.image}
                    alt=""
                    fill
                    className="object-cover transition group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="p-4 sm:p-6">
                  <h3 className="mb-3 text-xl font-black text-destiny-orange">
                    {card.title}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-muted">
                    {card.description}
                  </p>
                  <span
                    aria-hidden="true"
                    className={buttonClasses({ variant: "accentOutline", size: "md" })}
                  >
                    {card.cta}
                  </span>
                </div>
              </Card>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
