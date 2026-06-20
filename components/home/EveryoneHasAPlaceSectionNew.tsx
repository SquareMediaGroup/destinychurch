import AnimateIn from "@/components/AnimateIn";
import EveryoneHasAPlaceCarousel from "@/components/home/EveryoneHasAPlaceCarousel";

const groups = [
  {
    title: "Kids",
    href: "/kids",
    image: "/img/photos/Kids2.webp",
    description:
      "Destiny Kids is a fun place where children of all ages can learn more about the Bible through games, stories, and singing.",
  },
  {
    title: "Youth",
    href: "/youth",
    image: "/img/photos/EHAP_Youth.webp",
    description:
      "Destiny Youth is vibrant and engaging, ministry with a mission encounter God, build meaningful relationships, and make an impact in their schools and communities.",
  },
  {
    title: "Young Adults",
    href: "/young-adults",
    image: "/img/photos/YA1.webp",
    description:
      "A vibrant community of young adults worshipping, We seek together to build a deep and authentic relationship with Jesus Christ.",
  },
  {
    title: "Connect Groups",
    href: "/connect",
    image: "/img/photos/ConnectGroups.webp",
    description:
      "Our Connect Groups are an integral part of the life and health of the church. Together in a small group believers are effective, powerful and fruitful witnesses in the world.",
  },
  {
    title: "Teams",
    href: "/serve",
    image: "/img/photos/Training_DC-scaled.webp",
    description:
      "You are uniquely gifted to be a blessing to the body of Christ. Use your gifts and talents to serve on one of our teams, and together let's build His kingdom.",
  },
];

export default function EveryoneHasAPlaceSectionNew() {
  return (
    <section className="bg-white py-10 sm:py-16">
      <div className="mx-auto mb-6 max-w-7xl px-4 sm:mb-10 lg:px-8">
        <AnimateIn>
          <h2 className="text-center text-2xl font-black uppercase tracking-tight text-destiny-brown sm:text-3xl md:text-4xl">
            Everyone Has A Place
          </h2>
        </AnimateIn>
      </div>

      <AnimateIn delay={120}>
        <EveryoneHasAPlaceCarousel groups={groups} />
      </AnimateIn>
    </section>
  );
}
