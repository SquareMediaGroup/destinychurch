// Produce doc-ready images: crop each full-page screenshot to its top portion
// (hero + first sections) so it embeds at a readable size. Originals are kept.
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "docs", "leadership", "screenshots");
const OUT = path.join(SRC, "doc");
fs.mkdirSync(OUT, { recursive: true });

const MAX_H = 1700; // cap tall full-page shots to a clean top crop

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".jpg"));
for (const f of files) {
  const src = path.join(SRC, f);
  const meta = await sharp(src).metadata();
  const h = Math.min(meta.height, MAX_H);
  let img = sharp(src);
  if (meta.height > MAX_H) {
    img = img.extract({ left: 0, top: 0, width: meta.width, height: h });
  }
  await img.jpeg({ quality: 80 }).toFile(path.join(OUT, f));
  console.log(`${f}: ${meta.width}x${meta.height} -> ${meta.width}x${h}`);
}
console.log("✅ doc images ready");
