import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";


export default function MeetPastorsSection() {
  return (
    <section className="py-20" style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
          {/* Pastor photo */}
          <AnimateIn className="shrink-0">
            <Image
              src="/img/brand/Team/JonathanCath.png"
              alt="Jonathan & Cath Harris"
              width={380}
              height={480}
              className="w-72 object-contain md:w-80"
            />
          </AnimateIn>

          {/* Text */}
          <AnimateIn delay={100} className="pt-8">
            <h2 className="mb-5 text-4xl font-black text-white md:text-5xl">
              Meet Our{" "}
              <span className="relative inline-block">
                Pastors
                <Image
                  src="/img/brand/Scribble.png"
                  alt=""
                  width={400}
                  height={60}
                  className="absolute left-1/2 w-[110%] -translate-x-[49%]"
                  style={{ bottom: "-0.2em" }}
                  aria-hidden="true"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </span>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-white/70">
              Jonathan and Catherine are leaders with a passion for family, for the city and for
              seeing God&apos;s love and comfort outworked in people. They have both served as lead
              pastors at Destiny for over two decades. Jonathan is the church&apos;s Senior Pastor,
              passionate about building team and unleashing the potential in others. Catherine
              has a heart for teaching and training; she is an integral part of our Community and
              Care Team leading our town. They are proud parents to Faith &amp; Nadine Harris.
            </p>
            <p className="text-sm font-bold text-white/40">
              Jonathan &amp; Cath Harris, Lead Pastors
            </p>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
