"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console / monitoring; digest helps trace server errors.
    console.error("🛑 Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-3xl font-black text-destiny-grey">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-destiny-grey/70">
        Sorry, we hit a problem loading this page. You can try again, or head
        back to the home page.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-destiny-grey/20 px-6 py-3 text-sm font-bold text-destiny-grey transition hover:bg-destiny-grey/5"
        >
          Back to home
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-destiny-grey/40">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
