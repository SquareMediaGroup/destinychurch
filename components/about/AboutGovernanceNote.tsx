import Link from "next/link";

export default function AboutGovernanceNote() {
  return (
    <section className="bg-white py-6 sm:py-8">
      <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
        <p className="text-sm text-subtle">
          Learn more about{" "}
          <Link
            href="/governance"
            className="font-bold text-destiny-orange underline underline-offset-4"
          >
            our charity&apos;s governance and structure
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
