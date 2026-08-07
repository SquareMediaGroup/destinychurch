import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end cover for the content-block editor.
 *
 * Skipped unless credentials are supplied, so it never breaks CI or a local
 * run for anyone who hasn't set them up:
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx playwright test admin-blocks
 *
 * Credentials come from the environment only — never hardcode them here. The
 * repo's test login lives in the gitignored CLAUDE.local.md.
 *
 * NOTE: this spec has not itself been executed. It is written from the
 * implementation and needs one supervised run to confirm the selectors match.
 */

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("admin content blocks", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "Set ADMIN_EMAIL and ADMIN_PASSWORD to run the admin block tests.",
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("insert an FAQ, edit it, and see it round-trip", async ({ page }) => {
    await page.goto(`${BASE}/admin/posts`);

    // Open a new post.
    await page.getByRole("button", { name: /new post/i }).click();

    // Blocks live in their own surface, never the formatting toolbar.
    await expect(page.getByRole("button", { name: /^Blocks$/ })).toBeVisible();

    // The FAQ tile is in the Blocks sidebar (desktop) or sheet (mobile).
    const faqTile = page.getByRole("button", { name: /FAQ/ }).first();
    await faqTile.click();

    // The block lands in the canvas and is selected, so the inspector opens on it.
    const block = page.locator('[data-dc-block="faq"]');
    await expect(block).toBeVisible();
    await expect(block.locator("details")).toHaveCount(2);

    // Editing the heading in the inspector updates the block in place.
    const heading = page.getByLabel("Heading", { exact: true });
    await heading.fill("Before you visit");
    // The inspector debounces ~200ms before writing to the document.
    await expect(block.getByText("Before you visit")).toBeVisible({ timeout: 2000 });

    // Adding a question appends a row and a <details>.
    await page.getByRole("button", { name: /add question/i }).click();
    await expect(block.locator("details")).toHaveCount(3);
  });

  test("a block survives a save and renders on the public page", async ({ page }) => {
    const slug = `block-e2e-${Date.now()}`;

    await page.goto(`${BASE}/admin/posts`);
    await page.getByRole("button", { name: /new post/i }).click();
    await page.getByLabel(/title/i).fill("Block E2E");
    await page.getByLabel(/url slug/i).fill(slug);

    await page.getByRole("button", { name: /FAQ/ }).first().click();
    await page.getByLabel("Heading", { exact: true }).fill("Questions");

    // Publish so the public route renders it.
    await page.getByRole("switch", { name: /published/i }).click();
    await page.getByRole("button", { name: /create post|save changes/i }).click();

    await page.goto(`${BASE}/${slug}`);

    const block = page.locator('[data-dc-block="faq"]');
    await expect(block).toBeVisible();
    await expect(block.getByText("Questions")).toBeVisible();

    // The FAQ is native <details>, so it must expand with no JavaScript at all.
    // That is the whole reason it isn't React state.
    const summary = block.locator("summary").first();
    await summary.click();
    await expect(block.locator("details").first()).toHaveAttribute("open", "");
  });

});

/**
 * The zero-JS guarantee.
 *
 * Deliberately outside the authenticated describe above: it needs no login, so
 * it always runs. This is the test that actually proves the FAQ's central
 * design claim — that it ships no JavaScript and works on native
 * <details>/<summary> alone. If someone converts the block to React state to
 * add an animation, this fails.
 *
 * It renders through the dev gallery, which puts real blocks through the real
 * serialise → parse → render pipeline.
 */
test("the FAQ block expands with JavaScript disabled", async ({ browser }) => {
  // A separate context, because JS has to be off before the page loads.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(`${BASE}/dev/blocks`);

  const block = page.locator('[data-dc-block="faq"]');
  await expect(block).toBeVisible();

  const first = block.locator("details").first();
  await expect(first).not.toHaveAttribute("open", "");
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");

  await context.close();
});

async function signIn(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(EMAIL as string);
  await page.getByLabel(/password/i).fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
}
