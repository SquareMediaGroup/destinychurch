import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

const team = [
  {
    name: "Funke Awojide",
    role: "Safeguarding Lead",
    photo: "/img/brand/Team/FA.webp",
  },
  {
    name: "Faith Moradi",
    role: "Safeguarding Lead",
    photo: "/img/brand/Team/FH.webp",
  },
];

export default function KidsCampTeam() {
  return (
    <section className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-grey md:text-4xl">
            Safeguarding Leads
          </h2>
        </AnimateIn>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
          {team.map((member, i) => (
            <AnimateIn key={member.name} delay={i * 80}>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4 h-48 w-48 overflow-hidden rounded-full bg-destiny-orange/10">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
                <h3 className="text-lg font-bold text-destiny-grey">{member.name}</h3>
                <p className="text-sm text-destiny-grey/50">{member.role}</p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
