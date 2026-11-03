// Render sample frames for a quick visual check: node scripts/stills.mjs <compId> <outDir> <every>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [id = "ComingIn2027", outDir = "out/stills", every = "75", only] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
const frames = only ? only.split(",").map(Number) : [];
if (!only) for (let f = 20; f < composition.durationInFrames; f += Number(every)) frames.push(f);
for (const frame of frames) {
  await renderStill({ composition, serveUrl, output: `${outDir}/${id}-${String(frame).padStart(4, "0")}.jpg`, frame, imageFormat: "jpeg", jpegQuality: 80, browserExecutable, scale: 0.5 });
  console.log("still", frame);
}
