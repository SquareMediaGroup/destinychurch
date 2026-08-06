// One-off: capture full-page screenshots of every key route for the
// leadership feature document. Run against the local dev server (port 3000).
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "leadership", "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:3000";

// Pre-seed cookie consent so the banner never shows and embedded media loads.
const CONSENT = JSON.stringify({
  essential: true,
  media: true,
  analytics: true,
  updatedAt: Date.now(),
});

// Public marketing pages. [slug, filename, fullPage?]
const PUBLIC_PAGES = [
  ["/", "01-home", true],
  ["/about", "02-about", true],
  ["/whats-on", "03-whats-on", true],
  ["/sermons", "04-sermons", true],
  ["/give", "05-give", true],
  ["/new-here", "06-new-here", true],
  ["/kids", "07-kids", true],
  ["/youth", "08-youth", true],
  ["/young-adults", "09-young-adults", true],
  ["/connect", "10-connect", true],
  ["/alpha", "11-alpha", true],
  ["/beliefs", "12-beliefs", true],
  ["/missions", "13-missions", true],
  ["/contact", "14-contact", true],
  ["/hire", "15-hire", true],
  ["/governance", "16-governance", true],
  ["/give", "17-give-hero", false], // above-the-fold for hero shot
];

async function shoot(page, slug, file, fullPage) {
  const dest = path.join(OUT, `${file}.jpg`);
  if (fs.existsSync(dest)) {
    console.log(`⏭️  ${file}.jpg already exists, skipping`);
    return;
  }
  const url = BASE + slug;
  process.stdout.write(`📸 ${url} -> ${file}.jpg ... `);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  } catch {
    // networkidle can hang on pages with video/analytics; fall back.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await page.waitForTimeout(1500);
  // Scroll through the whole page so IntersectionObserver reveal animations
  // (opacity:0 -> 1) fire and lazy images load before we capture full-page.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    const max = document.body.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200); // settle after scroll back to top
  await page.screenshot({
    path: dest,
    fullPage,
    type: "jpeg",
    quality: 78,
  });
  console.log("done");
}

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  // Seed consent before any page script runs.
  await context.addInitScript(
    (consent) => window.localStorage.setItem("destiny-cookie-consent", consent),
    CONSENT
  );
  const page = await context.newPage();

  for (const [slug, file, fullPage] of PUBLIC_PAGES) {
    await shoot(page, slug, file, fullPage);
  }

  await browser.close();
  console.log("✅ public screenshots complete");
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
