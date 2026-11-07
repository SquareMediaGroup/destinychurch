// Prints YouTube chapter timestamps for a tutorial, to paste into its description.
// node scripts/youtube-chapters.mjs shop      (reads src/tutorials/shop-steps.json)
// The timing mirrors src/Tutorial.tsx (INTRO, CHAPTER_CARD, stepFrames); the total it prints should
// match `npx remotion compositions` for that tutorial. If it doesn't, Tutorial.tsx changed: update both.
import fs from "node:fs";

const id = process.argv[2];
const { steps } = JSON.parse(fs.readFileSync(new URL(`../src/tutorials/${id}-steps.json`, import.meta.url)));
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
lines.push(`${stamp(t)} Wrapping up`);
t += OUTRO + END;
console.log(lines.join("\n"));
console.log(`\n(total ${t} frames, ${stamp(t)})`);
