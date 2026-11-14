// Real Motion: YouTube chapter timestamps for a walkthrough, to paste into its description.
//   node chapters.mjs src/walkthroughs/<id>.json [--no-outro] [--no-end]
// The timing mirrors kit/Walkthrough.tsx (INTRO, CHAPTER_CARD, stepFrames, OUTRO, END). The total it
// prints should match the composition's length; if not, Walkthrough.tsx changed: update both.
import fs from "node:fs";

const [file, ...flags] = process.argv.slice(2);
const { steps } = JSON.parse(fs.readFileSync(file, "utf8"));
const FPS = 30, ACT = 28, BITE = 8;
const INTRO = 7 * FPS, CHAPTER_CARD = Math.round(2.4 * FPS), OUTRO = 8 * FPS, END = 4 * FPS;
const holdFor = (s) => Math.max(s.hold, s.caption.split(/\s+/).length * 0.3 + 0.7);
const stepFrames = (s) => Math.round(ACT + (s.frames.length ? s.frames.length * BITE : 0) + 6 + holdFor(s) * FPS);
const stamp = (f) => {
  const t = Math.floor(f / FPS);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const lines = ["0:00 Introduction"];
let t = INTRO;
let chapter = "";
for (const s of steps) {
  if (s.chapter !== chapter) {
    chapter = s.chapter;
    lines.push(`${stamp(t)} ${chapter}`);
    t += CHAPTER_CARD;
  }
  t += stepFrames(s);
}
if (!flags.includes("--no-outro")) {
  lines.push(`${stamp(t)} Wrapping up`);
  t += OUTRO;
}
if (!flags.includes("--no-end")) t += END;
console.log(lines.join("\n"));
console.log(`\n(total ${t} frames, ${stamp(t)})`);
