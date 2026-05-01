import type { Metadata } from "next";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "What We Believe",
  description: "Destiny Church's statement of faith and core beliefs — what the Bible says about God, Jesus Christ, the Holy Spirit, salvation, the Church and eternity.",
  alternates: { canonical: "/beliefs" },
  openGraph: {
    title: "What We Believe | Destiny Church",
    description: "Our statement of faith and the biblical foundations that shape everything we do at Destiny Church Tees Valley.",
    url: "https://destinytees.uk/beliefs",
  },
};

const beliefs = [
  {
    title: "Jesus Christ",
    body: "Jesus Christ is the Son of God. He is co-equal with the Father. Jesus lived a sinless human life and offered Himself as the perfect sacrifice for the sins of all people by dying on a cross. He arose from the dead after three days to demonstrate His power over sin and death. He ascended to Heaven's glory and will return someday to earth to reign as King of kings, and Lord of lords.",
  },
  {
    title: "The Holy Spirit",
    body: "The Holy Spirit is co-equal with the Father and the Son of God. He is present in the world to make us aware of our need for Jesus Christ. He also lives in every Christian from the moment of salvation. He provides the Christian with power for living, understanding of spiritual truth, and guidance in doing what is right. He gives every believer a spiritual gift when they are saved. As Christians, we seek to live under His control daily.",
  },
  {
    title: "The Bible",
    body: "The Bible is God's word to us. It was written by human authors, under the supernatural guidance of the Holy Spirit. It is the supreme source of truth for Christian beliefs and living. Because it is inspired by God, it is the truth without any mixture of error.",
  },
  {
    title: "Salvation",
    body: "Salvation is God's free gift to us but we must accept it. We can never make up for our own sin by self-improvement or good works. Only by trusting in Jesus Christ as God's offer of forgiveness can anyone be saved from sin's penalty. When we turn from our self-rule life and turn to Jesus in faith we are saved. Eternal life begins the moment one receives Jesus' life into their life by faith.",
  },
  {
    title: "Human Beings",
    body: "People are made in the spiritual image of God, to be like Him in character. People are the supreme object of God's creation. Although every person has tremendous potential for good, all of us are marred by an attitude of disobedience towards God called 'sin.' This attitude separates people from God and causes many problems in life.",
  },
  {
    title: "Eternity",
    body: "People were created to exist forever. We will either exist eternally separated from God by sin, or eternally with God through forgiveness and salvation. To be eternally separated from God is Hell. To be eternally in union with Him is eternal life. Heaven and Hell are real places of eternal existence.",
  },
];

export default function BeliefsPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-15 pb-15 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <Image
            src="/img/photos/Bible Image Destiny Church.webp"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          <div className="relative flex flex-col items-center justify-center px-8 py-[12rem] text-center sm:px-12 lg:px-16">
            <AnimateIn>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
                Our Beliefs
              </h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                What we believe as a church and why it matters
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Statement of Faith */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <AnimateIn>
            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Statement of Faith
            </p>
            <blockquote className="text-xl font-medium leading-relaxed text-white md:text-2xl lg:text-3xl">
              &ldquo;God is the creator and ruler of the universe. He has eternally existed in three
              personalities: the Father, the Son, and the Holy Spirit. These three personalities
              are co-equal and are one God.&rdquo;
            </blockquote>
          </AnimateIn>
        </div>
      </section>

      {/* What We Believe */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-16 text-3xl font-black text-destiny-grey md:text-4xl">
              What We Believe
            </h2>
          </AnimateIn>

          <div className="flex flex-col">
            {beliefs.map((belief, i) => (
              <AnimateIn key={belief.title} delay={i * 80}>
                <div className={`py-10 ${i !== 0 ? "border-t border-black/8" : ""}`}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                    0{i + 1}
                  </p>
                  <h3 className="mb-4 text-2xl font-black text-destiny-grey md:text-3xl">
                    {belief.title}
                  </h3>
                  <p className="text-base leading-relaxed text-destiny-grey/70 md:text-lg">
                    {belief.body}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
