import Link from "next/link";
import NotFoundSearch from "@/components/NotFoundSearch";
import { isSmartSearchEnabled } from "@/lib/serviceStatus";

export default async function NotFound() {
  const searchEnabled = await isSmartSearchEnabled();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-3xl font-black text-destiny-grey">
        Page not found
      </h1>
      <p className="mb-8 text-destiny-grey/70">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>

      <NotFoundSearch searchEnabled={searchEnabled} />

      <Link
        href="/"
        className="mt-8 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
      >
        Back to home
      </Link>

      <div className="mt-6 flex items-center gap-4 text-sm">
        <Link href="/help" className="font-medium text-destiny-grey/70 underline-offset-2 hover:text-destiny-orange hover:underline">
          Help
        </Link>
        <span className="text-destiny-grey/20">|</span>
        <Link href="/links" className="font-medium text-destiny-grey/70 underline-offset-2 hover:text-destiny-orange hover:underline">
          Useful Links
        </Link>
      </div>
    </div>
  );
}
