import { test, expect } from '@playwright/test';

// Runs against a local dev server by default — these cover the What's On
// rebuild, which the deployed site may not have yet. Point at another origin
// with EVENTS_BASE_URL=https://destinytees.uk npx playwright test events.
const BASE = process.env.EVENTS_BASE_URL ?? 'http://localhost:3000';

/**
 * The grid renders only future events, so anything asserted here has to be
 * derived from the live feed rather than hard-coded — event names change.
 */
async function firstEventSlug(request: { get: (url: string) => Promise<{ text: () => Promise<string> }> }) {
  const res = await request.get(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  return xml.match(/\/whats-on\/([a-z0-9-]+)</)?.[1] ?? null;
}

test.describe("What's On grid", () => {
  test('renders month headings and event cards', async ({ page }) => {
    await page.goto(`${BASE}/whats-on`);
    await expect(page).toHaveTitle(/What's On/);

    // Month headings group the grid, e.g. "AUGUST 2026".
    const months = page.locator('#events h2');
    await expect(months.first()).toBeVisible();
    await expect(months.first()).toHaveText(/[A-Z][a-z]+ \d{4}/);

    // Every card links to an on-site page, never straight to ChurchSuite.
    const cards = page.locator('#events a[href^="/whats-on/"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('shows no events that have already finished', async ({ page }) => {
    await page.goto(`${BASE}/whats-on`);
    const headings = await page.locator('#events h2').allTextContents();

    const now = new Date();
    for (const heading of headings) {
      const parsed = new Date(`1 ${heading}`);
      expect(parsed.getTime()).toBeGreaterThanOrEqual(
        new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      );
    }
  });

  test('search filters the grid', async ({ page }) => {
    await page.goto(`${BASE}/whats-on`);
    const before = await page.locator('#events a[href^="/whats-on/"]').count();
    expect(before).toBeGreaterThan(0);

    // The grid is server-rendered, so a fill that lands before React hydrates
    // dispatches an input event with no listener attached and is silently lost.
    // Retry the whole interaction rather than just the assertion.
    await expect(async () => {
      await page.getByLabel('Search events').fill('zzzzzznotanevent');
      await expect(page.getByText('No events found')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });

    await expect(page.locator('#events a[href^="/whats-on/"]')).toHaveCount(0);
  });

  test('the #events anchor still lands on the grid', async ({ page }) => {
    // ChurchHeader, the footer and the sitemap all deep-link to #events; the
    // featured banner sits deliberately outside it.
    await page.goto(`${BASE}/whats-on#events`);
    await expect(page.locator('#events')).toBeVisible();
    await expect(page.locator('#events').getByLabel('Search events')).toBeVisible();
  });
});

test.describe('Event detail page', () => {
  test('renders and links back to the grid', async ({ page, request }) => {
    const slug = await firstEventSlug(request);
    test.skip(!slug, 'No upcoming events in the ChurchSuite feed');

    await page.goto(`${BASE}/whats-on/${slug}`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See all events' })).toBeVisible();
  });

  test('sanitises the ChurchSuite description', async ({ page, request }) => {
    const slug = await firstEventSlug(request);
    test.skip(!slug, 'No upcoming events in the ChurchSuite feed');

    await page.goto(`${BASE}/whats-on/${slug}`);
    const about = page.locator('.rte-content');
    if ((await about.count()) === 0) return; // Not every event has a description.

    // The feed ships class="branded" and style="color:#f9c100" (invisible on
    // white); neither may survive, and nor may an inline event handler.
    const html = await about.innerHTML();
    expect(html).not.toMatch(/\sstyle=/i);
    expect(html).not.toMatch(/\sclass=/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/<script/i);
  });

  test('unknown slugs 404', async ({ request }) => {
    const res = await request.get(`${BASE}/whats-on/definitely-not-an-event-xyz`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(404);
  });
});

test.describe('Calendar download', () => {
  test('serves a valid ics file', async ({ request }) => {
    const slug = await firstEventSlug(request);
    test.skip(!slug, 'No upcoming events in the ChurchSuite feed');

    const res = await request.get(`${BASE}/api/events/${slug}/ics`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/calendar');
    expect(res.headers()['content-disposition']).toContain('attachment');

    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('END:VCALENDAR');
    expect(body).toContain('BEGIN:VEVENT');
    // Local wall-clock plus a VTIMEZONE, rather than a UTC conversion.
    expect(body).toContain('DTSTART;TZID=Europe/London:');
    expect(body).toContain('TZID:Europe/London');
    // RFC 5545 requires CRLF line endings.
    expect(body).toContain('\r\n');
  });

  test('404s for an unknown event', async ({ request }) => {
    const res = await request.get(`${BASE}/api/events/not-a-real-event/ics`);
    expect(res.status()).toBe(404);
  });
});

test.describe('Admin routes are protected', () => {
  test('the featured-event API rejects anonymous callers', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/featured-event`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test('the event picker rejects anonymous callers', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/events`, { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});

test.describe('Card variant previews', () => {
  // Temporary routes — delete this block along with app/home/ and
  // app/whats-on/new/ once a variant is chosen.
  for (const variant of ['a', 'a-pill', 'c']) {
    test(`/whats-on/new renders variant ${variant}`, async ({ page }) => {
      await page.goto(`${BASE}/whats-on/new?card=${variant}`);
      await expect(page.locator('#events a[href^="/whats-on/"]').first()).toBeVisible();
    });
  }

  test('preview routes are noindex', async ({ page }) => {
    await page.goto(`${BASE}/whats-on/new`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });
});
