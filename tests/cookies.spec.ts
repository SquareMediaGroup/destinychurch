import { test, expect } from '@playwright/test';

test('Cookie banner appears on first visit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Accept All' })).toBeVisible();
});

test('Accept All dismisses the cookie banner', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Accept All' }).click();
  await expect(page.getByRole('button', { name: 'Accept All' })).not.toBeVisible();
});

test('Cookie banner does not reappear after accepting', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Accept All' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Accept All' })).not.toBeVisible();
});
