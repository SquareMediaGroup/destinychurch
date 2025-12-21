import SermonSummary from "@/components/SermonSummary";
import TranscriptBlock from "@/components/TranscriptBlock";

export const dynamic = "force-static";

const demoSummary = `
- God meets us in ordinary moments as well as in the miraculous.
- Faith grows when we bring our whole story to Jesus—wins, wounds, and waiting.
- Community is the place we practice grace, tell the truth, and keep our eyes on the hope ahead.
`;

const demoTranscript = `00:00 Welcome everyone. Today we're talking about how God moves in both the ordinary and the miraculous.

02:15 You might think you need a dramatic encounter to grow, but most of the time growth happens in small, daily decisions.

05:30 We read the Gospels and see Jesus meeting people on dusty roads and at dinner tables, not just on mountaintops.

09:45 Faith expands when we let Jesus hold every part of our story—our wins, our wounds, and our waiting.

15:00 Community is where we practice grace. It's where we tell the truth kindly, forgive quickly, and encourage consistently.

20:30 The hope ahead is certain. Until then, we keep walking with Jesus together, one faithful step at a time.`;

export default function DemoSermonPage() {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-destiny-orange">
          Demo
        </p>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Sample Sermon</h1>
        <p className="text-sm text-destiny-grey">Example of summary and transcript components</p>
      </div>

      <SermonSummary summary={demoSummary} sermonId="demo" sermonTitle="Sample Sermon" />
      <TranscriptBlock transcript={demoTranscript} sermonId="demo" sermonTitle="Sample Sermon" />
    </div>
  );
}
