// Exports every scene of the DownloadToday film as a 1920x1080 still into stills/, plus separate
// before and after images (same framing, matching pills) for building sliders.
//
//   node scripts/export-stills.mjs            (REMOTION_BROWSER=<chrome-headless-shell> in a cloud container)
//
// Scene timing is read from src/Campaign.tsx, so the stills follow the timeline when it changes.
// Each scene is captured once it has settled: after its entrances, before its exit move.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const FPS = 30;
const CROSSFADE = 8;
const OUT = path.resolve("stills");
const browserExecutable = process.env.REMOTION_BROWSER || null;

// Frames before the end at which a scene has settled (its exit move is 22 frames unless noted).
const settle = (name) => {
  if (/^(Accessibility|Back of the seat|Help centre|Training|Governance|Links|Little things title)$/.test(name)) return 16;
  if (name === "Website end") return 32;
  if (name === "Download today" || name === "Coming in 2027" || name === "Destiny Church") return 10;
  return 24;
};

// Scenes whose zoom holds to the end: their main still is taken just before the zoom (frame from scene start).
const MAIN_AT = { "Smart Search": 145, "Smart Search on a phone": 105, DestinyAI: 185, Safety: 85, "Safety rules": 125 };

// Extra stills inside a scene: [name, frame from the scene start, suffix].
const EXTRAS = [
  ["Smart Search", 80, "typing"],
  ["Smart Search", 215, "zoom"],
  ["Smart Search on a phone", 60, "typing"],
  ["Smart Search on a phone", 175, "zoom"],
  ["Shop checkout", 120, "zoom"],
  ["DestinyAI", 50, "question"],
  ["DestinyAI", 130, "answer"],
  ["DestinyAI", 240, "zoom"],
  ["Safety", 155, "zoom"],
  ["Safety rules", 190, "zoom"],
];

const BEFORE_AFTER = [
  { name: "home", title: "A fresh new look.", first: true },
  { name: "visit", title: "Plan your visit", first: false },
  { name: "whatson", title: "What's On", first: false },
  { name: "give", title: "Give", first: false },
  { name: "alpha", title: "Alpha", first: false },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function timeline() {
  const src = fs.readFileSync("src/Campaign.tsx", "utf8");
  const body = src.slice(src.indexOf("<TransitionSeries>"));
  const re = /name=(?:"([^"]+)"|\{[^}]*\}) durationInFrames=\{([\d.]+) \* fps\}|(\{t\})/g;
  const scenes = [];
  let f = 0;
  for (const m of body.matchAll(re)) {
    if (m[3]) {
      f -= CROSSFADE;
      continue;
    }
    const duration = Math.round(Number(m[2]) * FPS);
    scenes.push({ name: m[1] ?? "Download today", start: f, duration });
    f += duration;
  }
  return scenes;
}

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
fs.mkdirSync(path.join(OUT, "before-after"), { recursive: true });

const film = await selectComposition({ serveUrl, id: "DownloadToday", browserExecutable });
const shots = [];
timeline().forEach((s) => {
  if (s.name === "Pause" || s.name.startsWith("Before and after: ") && s.name !== "Before and after: phone") return;
  shots.push({ file: slug(s.name), frame: s.start + (MAIN_AT[s.name] ?? s.duration - settle(s.name)) });
  for (const [name, at, suffix] of EXTRAS) if (name === s.name) shots.push({ file: `${slug(s.name)}-${suffix}`, frame: s.start + at });
});
shots.sort((a, b) => a.frame - b.frame);
let n = 0;
for (const shot of shots) {
  const output = path.join(OUT, `${String(++n).padStart(2, "0")}-${shot.file}.jpg`);
  await renderStill({ composition: film, serveUrl, output, frame: shot.frame, imageFormat: "jpeg", jpegQuality: 92, browserExecutable });
  console.log("✓", path.basename(output));
}

const pairs = [
  ...BEFORE_AFTER.map((p) => ({ id: "BeforeAfterStill", file: p.name, props: p })),
  { id: "ShopBeforeAfterStill", file: "shop", props: {} },
];
for (const p of pairs) {
  for (const freeze of ["before", "after"]) {
    const inputProps = { ...p.props, freeze };
    const composition = await selectComposition({ serveUrl, id: p.id, inputProps, browserExecutable });
    const output = path.join(OUT, "before-after", `${p.file}-${freeze}.jpg`);
    await renderStill({ composition, serveUrl, output, frame: 90, inputProps, imageFormat: "jpeg", jpegQuality: 92, browserExecutable });
    console.log("✓", `before-after/${path.basename(output)}`);
  }
}
