// One-off: capture screenshots of the admin / CMS area for the leadership doc.
// Logs in once with the testing credentials, then captures each admin screen.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "leadership", "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:3000";

const EMAIL = "developer@destinytees.uk";
const PASSWORD = "Matthew28:19-20";

// [slug, filename]
const ADMIN_PAGES = [
  ["/admin/pages", "20-admin-pages"],
  ["/admin/pages/ai", "21-admin-ai-builder"],
  ["/admin/sermons", "22-admin-sermons"],
  ["/admin/banner", "23-admin-banner"],
  ["/admin/popup", "24-admin-popup"],
  ["/admin/alpha", "25-admin-alpha"],
  ["/admin/redirects", "26-admin-redirects"],
];

async function settleAndShoot(page, file, fullPage = true) {
  const dest = path.join(OUT, `${file}.jpg`);
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    const max = document.body.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: dest, fullPage, type: "jpeg", quality: 78 });
  console.log(`done -> ${file}.jpg`);
}

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  // Seed cookie consent so the banner never overlaps admin content.
  await context.addInitScript(() =>
    window.localStorage.setItem(
      "destiny-cookie-consent",
      JSON.stringify({ essential: true, media: true, analytics: true, updatedAt: Date.now() })
    )
  );
  const page = await context.newPage();

  // 1. Login page (logged out) ----------------------------------------------
  if (!fs.existsSync(path.join(OUT, "19-admin-login.jpg"))) {
    process.stdout.write("📸 /admin/login (logged out) ... ");
    await page.goto(BASE + "/admin/login", { waitUntil: "networkidle", timeout: 45000 });
    await settleAndShoot(page, "19-admin-login");
  }

  // 2. Authenticate ----------------------------------------------------------
  process.stdout.write("🔐 logging in ... ");
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin\/(redirects|pages|sermons)/, { timeout: 45000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(2500);
  if (page.url().includes("/admin/login")) {
    console.log("FAILED — still on login page. Check credentials.");
    await browser.close();
    process.exit(2);
  }
  console.log("authenticated, landed on", page.url());

  // 3. Admin pages -----------------------------------------------------------
  for (const [slug, file] of ADMIN_PAGES) {
    if (fs.existsSync(path.join(OUT, `${file}.jpg`))) {
      console.log(`⏭️  ${file}.jpg exists, skipping`);
      continue;
    }
    process.stdout.write(`📸 ${slug} ... `);
    try {
      await page.goto(BASE + slug, { waitUntil: "networkidle", timeout: 45000 });
    } catch {
      await page.goto(BASE + slug, { waitUntil: "domcontentloaded", timeout: 45000 });
    }
    await settleAndShoot(page, file);
  }

  await browser.close();
  console.log("✅ admin screenshots complete");
};

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
