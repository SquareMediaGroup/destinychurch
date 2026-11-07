// Renders the admin help YouTube thumbnails (src/Thumbnails.tsx) to out/thumbnails/<id>.jpg.
// Pass a Chrome path in REMOTION_BROWSER if Remotion's own download isn't available.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ids = [...readFileSync(new URL("../src/Thumbnails.tsx", import.meta.url), "utf8").matchAll(/\{ id: "([\w-]+)", lines/g)].map((m) => m[1]);
const browser = process.env.REMOTION_BROWSER ? [`--browser-executable=${process.env.REMOTION_BROWSER}`] : [];
for (const id of ids) {
  execFileSync("npx", ["remotion", "still", `Thumb-${id}`, `out/thumbnails/${id}.jpg`, "--image-format=jpeg", "--jpeg-quality=92", "--log=error", ...browser], { stdio: "inherit" });
  console.log(`🖼️  ${id}`);
}
