type AnnouncementBannerProps = {
  message: string;
};

export default function AnnouncementBanner({ message }: AnnouncementBannerProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--foreground)] shadow-sm">
      <div
        aria-hidden
        className="absolute -left-10 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-destiny-orange/40 via-destiny-red/30 to-destiny-purple/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-12 -bottom-10 h-32 w-32 rounded-full bg-gradient-to-br from-destiny-blue/30 via-destiny-green/20 to-destiny-orange/25 blur-3xl"
      />
      <div className="relative space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destiny-orange">
          Important update
        </p>
        <p className="whitespace-pre-line text-sm text-destiny-grey">
          {message}
        </p>
      </div>
    </div>
  );
}
