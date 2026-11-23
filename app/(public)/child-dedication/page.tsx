import type { Metadata } from "next";
import Image from "next/image";
import MinistryHero from "@/components/ministry/MinistryHero";
import SplitSection from "@/components/ministry/SplitSection";
import FeatureGrid from "@/components/ministry/FeatureGrid";
import FormSection from "@/components/ministry/FormSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Child Dedication",
  description: "Dedicate your child to the Lord at Destiny Church Tees Valley. Request a child dedication and we'll be in touch.",
  alternates: { canonical: "/child-dedication" },
  openGraph: {
    title: "Child Dedication | Destiny Church Tees Valley",
    description: "Dedicate your child to the Lord at Destiny Church Tees Valley.",
    url: "https://destinytees.uk/child-dedication",
    images: [{ url: "/og/child-dedication.webp", width: 1200, height: 630, alt: "Child Dedication | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/child-dedication.webp"],
  },
};

const reasons = [
  { icon: "favorite", title: "A Gift from God", body: "Children are a heritage from the Lord. Dedication is a chance to thank him and give your child back to him." },
  { icon: "volunteer_activism", title: "A Parent's Promise", body: "Commit before God and your church family to raise your child to know and love Jesus." },
  { icon: "diversity_3", title: "A Church Family", body: "Our whole church stands with you, praying for and supporting your family on the journey." },
  { icon: "auto_awesome", title: "A Special Moment", body: "A meaningful celebration with friends and family during one of our Sunday services." },
];

export default function ChildDedicationPage() {
  return (
    <>
      <MinistryHero
        image="/img/photos/Kids1.webp"
        imageAlt="A family at Destiny Church"
        eyebrow="Family"
        title="Child Dedication"
        subtitle="Dedicate your child to the Lord."
        chips={[
          { icon: "calendar_month", label: "During a Sunday service" },
          { icon: "family_restroom", label: "Friends & family welcome" },
        ]}
      />

      <SplitSection
        eyebrow="What is Child Dedication?"
        title="A blessing for your family"
        reverse
        media={
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#f5f7fa]">
            <Image
              src="/img/photos/Kids2.webp"
              alt="Children at Destiny Church"
              fill
              sizes="(min-width: 1024px) 42vw, 92vw"
              className="object-cover"
            />
          </div>
        }
      >
        <p>
          Child dedication is a special moment where parents commit to raising their child
          in the love and knowledge of Jesus. It&apos;s a chance to publicly thank God for
          the gift of your child and to ask for his blessing on their life.
        </p>
        <p>
          During a Sunday service, our pastors will pray over your child and family,
          surrounded by your church family who promise to love, support and pray for you
          along the way. Fill in the form below to request a dedication.
        </p>
      </SplitSection>

      <FeatureGrid heading="Why Dedicate Your Child?" items={reasons} />

      <FormSection
        eyebrow="Request a Dedication"
        title="Dedicate Your Child"
        subtitle="Fill in the form below and we'll be in touch to arrange the details."
        src="https://destinytees.churchsuite.com/forms/tb7deesr"
        formTitle="Child Dedication request"
        height={900}
      />

      <WorshipWithUsSection />
    </>
  );
}
