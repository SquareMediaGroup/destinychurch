import ReactMarkdown from "react-markdown";

type SermonSummaryProps = {
  summary?: string;
};

function normalizeSummary(summary: string) {
  return summary
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      return trimmed.replace(/^[•*-]\s*/, "- ");
    })
    .join("\n")
    .trim();
}

export default function SermonSummary({ summary }: SermonSummaryProps) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-3 text-sm text-destiny-grey">
        AI summary is unavailable.
      </div>
    );
  }

  const formatted = normalizeSummary(summary);
  if (!formatted) {
    return (
      <div className="rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-3 text-sm text-destiny-grey">
        AI summary is unavailable.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white px-4 py-4 shadow-sm sm:px-5">
      <p className="subheading text-sm text-destiny-orange">Summary</p>
      <ReactMarkdown
        className="mt-2 space-y-3 text-sm leading-relaxed text-destiny-grey"
        components={{
          p: (props) => <p className="leading-relaxed text-destiny-grey" {...props} />,
          strong: (props) => <strong className="font-semibold text-destiny-black" {...props} />,
          em: (props) => <strong className="font-semibold text-destiny-black" {...props} />,
          code: (props) => (
            <code className="rounded bg-destiny-grey/10 px-1 py-0.5 text-[13px] text-destiny-black" {...props} />
          ),
          a: (props) => (
            <a className="font-semibold text-destiny-orange underline" target="_blank" rel="noreferrer" {...props} />
          ),
          ul: (props) => <ul className="ml-4 list-disc space-y-2 text-destiny-grey" {...props} />,
          ol: (props) => <ol className="ml-4 list-decimal space-y-2 text-destiny-grey" {...props} />,
          li: (props) => <li className="leading-relaxed" {...props} />,
        }}
      >
        {formatted}
      </ReactMarkdown>
    </div>
  );
}
