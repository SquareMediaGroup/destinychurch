import AnimateIn from "@/components/AnimateIn";

export default function KidsCampDetails() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-8 lg:px-12">
        <AnimateIn>
          <h2 className="mb-8 text-3xl font-black leading-tight text-destiny-grey md:text-4xl lg:text-5xl">
            About the Camp
          </h2>
          <div className="space-y-6 text-base leading-relaxed text-destiny-grey/70 md:text-lg">
            <p>
              We are hosting a kids camp for Destiny Kids in May 2026! Kids in Year 1 to Year 6 have the exciting opportunity to attend our 3 days residential kids camp at Moor House Adventure Centre.
            </p>
            <p>
              This camp will be a special time for discipleship, where kids will have extended moments to learn about God from the Bible, worship, pray, and enjoy fun activities together.
            </p>
            <p>
              Camp Cost (£85): This cost covers accommodation at Moor House Adventure Centre, daily meals, crafts and activities. Please note that transportation is not included in this cost.
            </p>
            <p>
              Transportation: Parents will be responsible for transportation (drop-off at the venue and pick-up after camp)
            </p>
            <p>
              You have the option to either make a deposit to secure your child's space and pay the balance in two instalments or pay in full right away.
            </p>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
