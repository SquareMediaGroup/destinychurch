"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { STATUS_PAGE_URL } from "@/lib/outage";

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
      <p className="mb-8 max-w-md text-muted">
        Sorry, we hit a problem loading this page. You can try again, or head
        back to the home page.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} size="md">
          Try again
        </Button>
        <Button href="/" variant="outline" size="md">
          Back to home
        </Button>
      </div>
      <a
        href={STATUS_PAGE_URL}
        className="mt-6 text-sm font-semibold text-destiny-orange underline underline-offset-4 hover:no-underline"
      >
        Check service status
      </a>
      {error.digest && (
        <p className="mt-6 text-xs text-subtle">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
