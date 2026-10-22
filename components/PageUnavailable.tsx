import Link from "next/link";
import ServiceUnavailable from "@/components/ServiceUnavailable";

/**
 * Stands in for a whole page whose content couldn't be loaded — used where the
 * page would otherwise call notFound(), so a working link doesn't claim the
 * page is gone just because the data behind it is unreachable for a while.
 */
export default function PageUnavailable({ what = "this page" }: { what?: string }) {
  return (
    <section className="flex min-h-[60vh] items-center bg-white px-4 pb-16 pt-32">
      <div className="w-full">
        <ServiceUnavailable title={`We can't load ${what} right now`}>
          Part of our website is having trouble at the moment. The page is
          still here, so please try again in a little while.
        </ServiceUnavailable>
        <p className="mt-6 text-center">
          <Link href="/" className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-destiny-grey">
            Back to the home page
          </Link>
        </p>
      </div>
    </section>
  );
}
