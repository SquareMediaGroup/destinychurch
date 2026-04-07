import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('https://destinychurch.vercel.app/sermons');
  await page.getByRole('button', { name: 'Accept All' }).click();
});

test('Sermons page has correct title', async ({ page }) => {
  await expect(page).toHaveTitle(/Sermons/);
});

test('Sermons page lists sermon cards', async ({ page }) => {
  // At least one sermon card should be present
  const cards = page.locator('a[href*="/sermons/"]');
  await expect(cards.first()).toBeVisible();
});

test('Clicking a sermon navigates to sermon detail', async ({ page }) => {
  const firstSermon = page.locator('a[href*="/sermons/"]').first();
  await firstSermon.click();
  await expect(page).toHaveURL(/\/sermons\/.+/);
});

test('Guest speakers page loads', async ({ page }) => {
  await page.goto('https://destinychurch.vercel.app/sermons/guest-speakers');
  await expect(page).toHaveTitle(/Guest Speakers/);
});
