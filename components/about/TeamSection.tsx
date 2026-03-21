import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

const leadTeam = [
  { name: "Faith Harris", role: "Associate Pastor", photo: "/img/brand/Team/FH.png" },
  { name: "Tracy Reddy", role: "Small Groups", photo: "/img/brand/Team/TR.png" },
  { name: "Deveshin Reddy", role: "Finance & Facilities", photo: "/img/brand/Team/DR.png" },
  { name: "Nkeoruuem Ekanem", role: "Creativity & Innovation", photo: "/img/brand/Team/NE.png" },
];

const departmentHeads = [
  { name: "Funke Awojide", role: "Kids Pastor", photo: "/img/brand/Team/FA.png" },
  { name: "Younes Moradi", role: "Stewarding", photo: null },
  { name: "David Bayode", role: "Worship", photo: "/img/brand/Team/Debo.png" },
];

function TeamCard({ name, role, photo }: { name: string; role: string; photo: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-3 w-40 rounded-2xl overflow-hidden" style={{ background: "#f8f6f3" }}>
        {photo ? (
          <Image src={photo} alt={name} width={160} height={220} className="w-full object-contain" />
        ) : (
          <div className="flex h-40 items-center justify-center text-3xl font-black text-destiny-grey/30">
            {initials}
          </div>
        )}
      </div>
      <p className="font-bold text-destiny-grey">{name}</p>
      <p className="text-sm text-destiny-grey/50">{role}</p>
    </div>
  );
}

export default function TeamSection() {
  return (
    <section className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* Lead Team */}
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-orange md:text-4xl">
            Lead Team
          </h2>
        </AnimateIn>
        <div className="mb-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {leadTeam.map((member, i) => (
            <AnimateIn key={member.name} delay={i * 80}>
              <TeamCard {...member} />
            </AnimateIn>
          ))}
        </div>

        {/* Department Heads */}
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-orange md:text-4xl">
            Department Heads
          </h2>
        </AnimateIn>
        <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-3 lg:max-w-2xl lg:mx-auto">
          {departmentHeads.map((member, i) => (
            <AnimateIn key={member.name} delay={i * 80}>
              <TeamCard {...member} />
            </AnimateIn>
          ))}
        </div>

        <AnimateIn>
          <div className="text-center">
            <Link
              href="/serve"
              className="inline-flex items-center justify-center rounded-full border-2 border-destiny-orange px-8 py-3 text-sm font-bold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
            >
              View All
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
