export default function NotFound() {
  return (
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-10 shadow-sm lg:px-12">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
        The page or sermon you’re looking for can’t be found.
      </h1>
      <form
        action="/sermons"
        method="get"
        className="mt-6 flex w-full max-w-lg items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2"
      >
        <input
          type="search"
          name="q"
          placeholder="Search sermons..."
          aria-label="Search sermons"
          className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-destiny-grey/70 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-destiny-orange px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          Search
        </button>
      </form>
    </div>
  );
}
