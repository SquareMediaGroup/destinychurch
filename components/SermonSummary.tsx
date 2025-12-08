type SermonSummaryProps = {
  summary?: string;
};

export default function SermonSummary({ summary }: SermonSummaryProps) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-3 text-sm text-destiny-grey">
        AI summary is unavailable.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white px-4 py-4 shadow-sm sm:px-5">
      <p className="subheading text-sm text-destiny-orange">Summary</p>
      <p className="mt-2 whitespace-pre-line text-destiny-grey">{summary}</p>
    </div>
  );
}
