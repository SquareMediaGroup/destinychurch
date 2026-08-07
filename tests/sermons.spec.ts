import { test, expect } from '@playwright/test';

const BASE = process.env.SERMONS_BASE_URL ?? 'https://destinychurch.vercel.app';

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/sermons`);
  await page.getByRole('button', { name: /Accept All/i }).click();
});

test('Sermons page has correct title', async ({ page }) => {
  await expect(page).toHaveTitle(/Sermons/);
});

test('Latest message leads with video and offers audio', async ({ page }) => {
  // The featured slot is a Watch/Listen switch, not a link — Watch is the default.
  const watch = page.getByRole('tab', { name: /Watch/ });
  await expect(watch).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();

  await page.getByRole('tab', { name: /Listen/ }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Listen now|Playing/ })).toBeVisible();
});

test('Archive lists playable audio episodes', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /All episodes/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Play / }).first()).toBeVisible();
});

test('Full recording link navigates to the sermon detail page', async ({ page }) => {
  await page.getByRole('link', { name: /Open the full recording/i }).click();
  await expect(page).toHaveURL(/\/sermons\/.+/);
});
