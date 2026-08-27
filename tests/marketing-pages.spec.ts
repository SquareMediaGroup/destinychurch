import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'https://destinychurch.vercel.app';

/**
 * Broad smoke coverage for the static/marketing pages that don't otherwise
 * have a dedicated spec: each one loads, carries its expected <title>, and
 * renders a visible top-level heading. Not exhaustive per-page behaviour —
 * that lives in dedicated specs (contact.spec.ts, give.spec.ts, etc.) — just
 * a tripwire for "the page 500s" or "the heading silently vanished".
 */
const pages: { path: string; title: RegExp; heading: RegExp }[] = [
  { path: '/about', title: /About Us/, heading: /About/ },
  { path: '/beliefs', title: /What We Believe/, heading: /Beliefs/ },
  { path: '/missions', title: /Missions/, heading: /Missions/ },
  { path: '/visit', title: /Plan Your Visit/, heading: /Plan Your Visit/ },
  { path: '/kids', title: /Destiny Kids/, heading: /Kids/ },
  { path: '/dckids', title: /Kids Camp/, heading: /Camp/ },
  { path: '/youth', title: /Destiny Youth/, heading: /Youth/ },
  { path: '/young-adults', title: /Young Adults/, heading: /Young Adults/ },
  { path: '/serve', title: /Serve/, heading: /Serve/ },
  { path: '/volunteer', title: /Volunteer/, heading: /Volunteer/ },
  { path: '/safeguarding', title: /Safeguarding Policy/, heading: /Safeguarding/ },
  { path: '/jobs', title: /Jobs/, heading: /calling/i },
  { path: '/terms', title: /Terms of Use/, heading: /Terms/ },
  { path: '/privacy', title: /Privacy Policy/, heading: /Privacy/ },
  { path: '/accessibility', title: /.+/, heading: /Accessibility/ },
  { path: '/data-gdpr', title: /Data & GDPR Policy/, heading: /Data|GDPR/ },
  { path: '/baptism', title: /Baptism/, heading: /Baptism/ },
  { path: '/child-dedication', title: /Child Dedication/, heading: /Child Dedication/ },
  { path: '/hire', title: /Hire Our Venue/, heading: /Hire/ },
  { path: '/help', title: /Help/, heading: /Help/ },
  { path: '/governance', title: /Governance/, heading: /Governance/ },
  { path: '/links', title: /Next Steps/, heading: /.+/ },
  { path: '/nfc', title: /Welcome/, heading: /.+/ },
  { path: '/live', title: /Watch Live/, heading: /Live/ },
  { path: '/shop', title: /Shop/, heading: /.+/ },
  { path: '/alpha', title: /.+/, heading: /.+/ },
  { path: '/bible-course', title: /.+/, heading: /.+/ },
  { path: '/destiny-recovery', title: /.+/, heading: /.+/ },
  { path: '/cap-money', title: /.+/, heading: /.+/ },
];

for (const { path, title, heading } of pages) {
  test(`${path} loads with title and a visible heading`, async ({ page }) => {
    const response = await page.goto(`${BASE}${path}`);
    expect(response?.ok(), `expected ${path} to respond OK`).toBeTruthy();

    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('h1').first()).toContainText(heading);
  });
}

test.describe('404 handling', () => {
  test('an unknown path renders the not-found page, not a 500', async ({ page }) => {
    const response = await page.goto(`${BASE}/this-page-definitely-does-not-exist`);
    expect(response?.status()).toBe(404);
  });
});
