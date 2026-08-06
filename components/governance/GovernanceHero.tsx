import AnimateIn from "@/components/AnimateIn";

export default function GovernanceHero() {
  return (
    <section className="bg-white pt-20 pb-12">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Transparency
          </p>
          <h1 className="mb-5 text-4xl font-black text-destiny-grey md:text-5xl">
            Governance &amp; Registration
          </h1>
          <p className="text-base leading-relaxed text-destiny-grey/60">
            Destiny Church Tees Valley is a registered charity in England and
            Wales and a company limited by guarantee. The details on this page
            are drawn directly from the public registers held by the Charity
            Commission and Companies House, so you can check who we are, who
            leads us and how we steward what we are given.
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
