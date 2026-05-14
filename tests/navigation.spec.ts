import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Accept All' }).click();
});

test('Homepage loads with correct title', async ({ page }) => {
  await expect(page).toHaveTitle(/Destiny Church/);
});

test('Footer Give link navigates to give page', async ({ page }) => {
  await page.getByRole('link', { name: 'Give' }).last().click();
  await expect(page).toHaveURL(/\/give/);
  await expect(page.getByRole('heading', { name: 'Give' }).first()).toBeVisible();
});

test('Footer Contact Us link navigates to contact page', async ({ page }) => {
  await page.getByRole('link', { name: 'Contact Us' }).last().click();
  await expect(page).toHaveURL(/\/contact/);
  await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
});

test('Nav Plan a Visit link navigates correctly', async ({ page }) => {
  await page.getByRole('link', { name: 'Plan a Visit' }).first().click();
  await expect(page).toHaveURL(/\/visit/);
  await expect(page.getByRole('heading', { name: 'Plan Your Visit' })).toBeVisible();
});

test('Sermons page loads', async ({ page }) => {
  await page.goto('/sermons');
  await expect(page).toHaveTitle(/Sermons/);
});

test("What's On page loads", async ({ page }) => {
  await page.goto('/whats-on');
  await expect(page).toHaveTitle(/What's On/);
});

test('Connect Groups page loads', async ({ page }) => {
  await page.goto('/connect');
  await expect(page).toHaveTitle(/Connect Groups/);
});

test('Serve page loads', async ({ page }) => {
  await page.goto('/serve');
  await expect(page.getByRole('heading', { name: 'Serve' }).first()).toBeVisible();
});

test('New Here page loads', async ({ page }) => {
  await page.goto('/new-here');
  await expect(page).toHaveTitle(/New Here/);
});
