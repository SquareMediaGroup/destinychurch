import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

test('Test Contact Us Form', async ({ page }) => {
  await page.goto('https://destinychurch.vercel.app');

  await page.getByRole('button', { name: 'Accept All' }).click();

  // Click the get started link.
  await page.getByRole('link', { name: 'Plan a Visit' }).first().click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Plan Your Visit' })).toBeVisible();

  await page.getByRole('link', { name: 'Contact Us' }).click();
  
  await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();

  await page.locator('#name').fill('John Doe');
  await page.locator('#email').fill('john.doe@example.com');
  await page.locator('#subject').selectOption('Other');
  await page.locator('#message').fill('Hello, this is a test message.');
  await page.getByRole('button', { name: 'Send Message' }).click();
});
