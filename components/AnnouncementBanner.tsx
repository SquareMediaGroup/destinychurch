type AnnouncementBannerProps = {
  message: string;
};

export default function AnnouncementBanner({ message }: AnnouncementBannerProps) {
  return (
    <div className="rounded-2xl border border-destiny-orange/20 bg-destiny-orange/10 px-4 py-4 text-sm text-[var(--foreground)] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destiny-orange">
        Important update
      </p>
      <p className="mt-1 whitespace-pre-line text-sm text-destiny-grey">
        {message}
      </p>
    </div>
  );
}
