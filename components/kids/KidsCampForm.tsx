import AnimateIn from "@/components/AnimateIn";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

export default function KidsCampForm() {
  return (
    <section className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-4xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-4 text-center text-2xl font-black text-destiny-grey md:text-3xl">
            Register your Child
          </h2>
        </AnimateIn>
        <AnimateIn delay={100}>
          <ChurchSuiteEmbed
            src="https://destinytees.churchsuite.com/events/gtxi02n4"
            title="Register your Child"
            height={700}
            className="rounded-3xl border border-black/5 shadow-sm"
          />
        </AnimateIn>
      </div>
    </section>
  );
}
