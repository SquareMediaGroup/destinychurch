import { test, expect, type Page } from "@playwright/test";
import { COURSE_ADMIN_PAGES, COURSE_EVENT_META } from "../lib/courseEvents";

/**
 * End-to-end cover for the four course admin pages.
 *
 * They used to be four ~630-line copies of each other and are now four
 * four-line files over components/admin/CourseAdminPage.tsx, driven by
 * COURSE_ADMIN_PAGES. That means a registry mistake — wrong accent, missing
 * heading, a page pointed at the wrong event type — renders a working-looking
 * page with the wrong content, which unit tests on the registry can catch but
 * only rendering can confirm.
 *
 * Skipped unless credentials are supplied, following tests/admin-blocks.spec.ts:
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx playwright test admin-courses --project=chromium
 *
 * Credentials come from the environment only — never hardcode them here. The
 * repo's test login lives in the gitignored CLAUDE.local.md.
 */

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("course admin pages", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "Set ADMIN_EMAIL and ADMIN_PASSWORD to run the course admin tests.",
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  for (const [slug, config] of Object.entries(COURSE_ADMIN_PAGES)) {
    test(`/admin/${slug} renders its own heading, banners and lists`, async ({
      page,
    }) => {
      await page.goto(`${BASE}/admin/${slug}`);

      await expect(
        page.getByRole("heading", { level: 1, name: config.heading }),
      ).toBeVisible();
      await expect(page.getByText(config.blurb)).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: config.promoteHeading }),
      ).toBeVisible();

      // One banner toggle card and one event list per type the page owns.
      for (const type of config.types) {
        const meta = COURSE_EVENT_META[type];
        await expect(page.getByText(meta.label, { exact: true })).toBeVisible();
        await expect(page.getByText(meta.hint)).toBeVisible();
        await expect(
          page.getByText(new RegExp(`${meta.eventsLabel} \\(\\d+\\)`)),
        ).toBeVisible();
      }

      // The type selector only appears where there is a choice to make.
      const selector = page.getByLabel(/^type/i);
      if (config.types.length > 1) {
        await expect(selector).toBeVisible();
        await expect(selector.locator("option")).toHaveCount(
          config.types.length,
        );
      } else {
        await expect(selector).toHaveCount(0);
      }

      // The create form is present and uses this page's accent.
      const submit = page.getByRole("button", { name: /create event/i });
      await expect(submit).toBeVisible();
      await expect(submit).toHaveCSS(
        "background-color",
        hexToCssRgb(config.accent),
      );
    });
  }

  test("the online format reveals meeting fields", async ({ page }) => {
    await page.goto(`${BASE}/admin/cap-money`);

    await expect(page.getByLabel(/location/i)).toBeVisible();

    await page.getByRole("button", { name: /online/i }).click();

    await expect(page.getByLabel(/platform/i)).toBeVisible();
    await expect(page.getByLabel(/meeting id/i)).toBeVisible();
    await expect(page.getByLabel(/direct join link/i)).toBeVisible();
    await expect(page.getByLabel(/location/i)).toBeHidden();
  });

  test("a custom frequency reveals the interval field", async ({ page }) => {
    await page.goto(`${BASE}/admin/bible-course`);

    await page.getByLabel(/frequency/i).selectOption("custom");

    await expect(page.getByText("every")).toBeVisible();
    await expect(page.getByText("days")).toBeVisible();
  });
});

function hexToCssRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(EMAIL as string);
  await page.getByLabel(/password/i).fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
}
