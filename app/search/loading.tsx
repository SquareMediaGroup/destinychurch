export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] pt-28 pb-20">
      <div className="mx-auto max-w-2xl px-4 lg:px-6">

        {/* Search bar skeleton */}
        <div className="mb-7 h-[50px] animate-pulse rounded-full bg-white shadow-sm ring-1 ring-black/5" />

        {/* AI Overview skeleton */}
        <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="h-[3px] bg-gray-100" />
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded-full bg-gray-100" />
              <div className="h-5 w-28 animate-pulse rounded-full bg-gray-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="mt-5 h-9 w-32 animate-pulse rounded-full bg-gray-100" />
          </div>
        </div>

        {/* Results skeleton */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 ${i < 3 ? "border-b border-gray-100" : ""}`}
            >
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-gray-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-44 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
