// One-off authoring script: regenerate COURSE_GRADIENTS in lib/courses.ts.
//
// Course artwork is WebP, which the runtime decoders (jpeg-js/pngjs) do not
// handle — and pulling `sharp` into the request path blew the /[slug] Vercel
// function past its 250MB limit. Since these four images are static and
// committed, their gradients are computed here and pasted into lib/courses.ts.
//
// Run after changing any course `card.image`:
//   npx tsx scripts/precompute-course-gradients.ts
//
// `sharp` is a devDependency-grade use here only — nothing in the app imports it.
import sharp from "sharp";
import path from "node:path";
import { COURSES, COURSE_ORDER } from "../lib/courses";
import { dominantColour, gradientFrom } from "../lib/promo-gradient";

async function main() {
  console.log("🎨 Computing course card gradients\n");
  const lines: string[] = [];

  for (const id of COURSE_ORDER) {
    const { card, name } = COURSES[id];
    const file = path.join(process.cwd(), "public", card.image);

    // Downscale first: the dominant-colour histogram only needs a thumbnail.
    const { data } = await sharp(file)
      .resize(100, 100, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const dominant = dominantColour(new Uint8Array(data));
    if (!dominant) throw new Error(`no dominant colour for ${card.image}`);

    const gradient = gradientFrom(dominant);
    console.log(`  ${name.padEnd(20)} ${card.image}`);
    console.log(`  ${" ".repeat(20)} ${gradient}\n`);
    lines.push(`  ${id}: "${gradient}",`);
  }

  console.log("Paste into lib/courses.ts:\n");
  console.log("export const COURSE_GRADIENTS: Record<CourseId, string> = {");
  console.log(lines.join("\n"));
  console.log("};");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
