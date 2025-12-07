type TranscriptBlockProps = {
  transcript?: string;
};

export default function TranscriptBlock({ transcript }: TranscriptBlockProps) {
  if (!transcript) {
    return (
      <div className="rounded-xl border border-destiny-grey/10 bg-destiny-grey/5 px-4 py-3 text-sm text-destiny-grey">
        Transcript will appear after processing.
      </div>
    );
  }

  return (
    <details className="group rounded-xl border border-black/5 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-destiny-black transition group-open:border-b group-open:border-black/5 sm:px-5">
        Transcript
        <span className="text-xs font-medium text-destiny-orange">
          Click to toggle
        </span>
      </summary>
      <div className="px-4 pb-4 pt-2 text-sm leading-relaxed text-destiny-grey sm:px-5">
        <p className="whitespace-pre-line">{transcript}</p>
      </div>
    </details>
  );
}
