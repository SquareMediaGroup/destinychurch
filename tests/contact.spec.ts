import { test, expect } from '@playwright/test';


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
