"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

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
      {error.digest && (
        <p className="mt-6 text-xs text-subtle">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
