import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/give');
  await page.getByRole('button', { name: 'Accept All' }).click();
});

test('Give page has correct heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Give' }).first()).toBeVisible();
});

test('Give page has title tag', async ({ page }) => {
  await expect(page).toHaveTitle(/Give/);
});
