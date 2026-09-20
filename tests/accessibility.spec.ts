import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "https://destinychurch.vercel.app";

/**
 * Keyboard and assistive-technology basics that are easy to regress silently,
 * because nothing about the page *looks* wrong when they break.
 *
 * Each of these covers a defect that was actually present:
 *
 *  - no skip link at all, so every keyboard user tabbed the whole dropdown nav
 *    on every page before reaching content;
 *  - the mobile menu stayed in the DOM when closed with only
 *    `pointer-events: none`, so its links were still tab-reachable and still
 *    announced, invisibly, on every page;
 *  - no `:focus-visible` rule anywhere, against ~470 raw buttons;
 *  - the accessibility page's own two toggles stripped their focus ring and
 *    put nothing back.
 */

const MOBILE = { width: 390, height: 844 };

test("the first Tab reaches a working skip link", async ({ page }) => {
  await page.goto(`${BASE}/`);

  await page.keyboard.press("Tab");

  const focused = page.locator(":focus");
  await expect(focused).toHaveText(/skip to main content/i);

  // It must be visible once focused — an `sr-only` link that never reveals
  // itself is no use to a sighted keyboard user.
  await expect(focused).toBeInViewport();

  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("<main> exists and is the skip target", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator("main#main")).toHaveCount(1);
});

test("the closed mobile menu is not reachable by keyboard", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto(`${BASE}/`);

  const menu = page.locator("#mobile-menu");
  await expect(menu).toHaveAttribute("inert", /.*/);

  // `inert` is what removes the subtree from the tab order; assert the effect
  // rather than only the attribute, since the attribute is easy to keep while
  // breaking the behaviour.
  const reachable = await page.evaluate(() => {
    const menuEl = document.querySelector("#mobile-menu");
    if (!menuEl) return "no menu";
    return [...menuEl.querySelectorAll("a[href], button")].some(
      (el) => !(el as HTMLElement).inert && el.closest("[inert]") === null,
    );
  });
  expect(reachable).toBe(false);
});

test("the mobile menu opens, traps Escape, and returns focus", async ({
  page,
}) => {
  await page.setViewportSize(MOBILE);
  await page.goto(`${BASE}/`);

  const toggle = page.getByRole("button", { name: /open navigation/i });
  await toggle.click();

  const menu = page.locator("#mobile-menu");
  await expect(menu).not.toHaveAttribute("inert", /.*/);
  await expect(menu).toHaveAttribute("aria-modal", "true");

  // Focus should have moved into the menu rather than staying on the toggle.
  await expect
    .poll(async () =>
      page.evaluate(
        () => !!document.activeElement?.closest("#mobile-menu"),
      ),
    )
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("inert", /.*/);
  await expect(toggle).toBeFocused();
});

test("the header nav is a labelled landmark and marks the current page", async ({
  page,
}) => {
  await page.goto(`${BASE}/give`);

  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Main" }).locator('[aria-current="page"]'),
  ).toHaveCount(1);
});

test("the accessibility page's own toggles are focusable switches", async ({
  page,
}) => {
  await page.goto(`${BASE}/accessibility`);

  const switches = page.getByRole("switch");
  await expect(switches).toHaveCount(2);

  // Each must take focus and report its state — the previous implementation
  // hid a checkbox and stripped the visible element's focus ring.
  const first = switches.first();
  await first.focus();
  await expect(first).toBeFocused();

  const before = await first.getAttribute("aria-checked");
  await first.press("Enter");
  await expect(first).not.toHaveAttribute("aria-checked", before ?? "");
});

test("icon ligature text is not exposed to assistive tech", async ({ page }) => {
  await page.goto(`${BASE}/accessibility`);

  // Material Symbols renders by ligature, so an unhidden icon span is read out
  // as its raw name. Nothing on the page should expose one.
  const leaked = await page.evaluate(() =>
    [...document.querySelectorAll(".material-symbols-rounded")]
      .filter((el) => {
        // An ancestor marked aria-hidden hides the whole subtree, so checking
        // the icon's own attribute alone reports false positives — several
        // icons are correctly hidden by a wrapper that carries a display
        // utility the icon itself cannot take.
        const hidden = el.closest('[aria-hidden="true"]') !== null;
        const named =
          el.getAttribute("role") === "img" && el.getAttribute("aria-label");
        return !hidden && !named;
      })
      .map((el) => el.textContent?.trim() ?? ""),
  );
  expect(leaked).toEqual([]);
});
