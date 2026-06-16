// Shared branded loading skeleton used by route-level loading.tsx files.
// Renders a calm, on-brand placeholder while server components fetch data.

export default function PageLoader({
  label = "Loading",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto flex min-h-[60vh] w-full max-w-7xl flex-col items-center justify-center gap-8 px-4 py-16"
    >
      <span className="sr-only">{label}…</span>

      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-destiny-orange/20 border-t-destiny-orange" />

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl bg-white shadow-sm"
          >
            <div className="aspect-[16/10] w-full animate-pulse bg-destiny-grey/10" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-destiny-grey/10" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-destiny-grey/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
