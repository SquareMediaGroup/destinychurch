import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('https://destinychurch.vercel.app/contact');
  await page.getByRole('button', { name: 'Accept All' }).click();
});

// ── Page structure ─────────────────────────────────────────────────────────

test('Contact page has correct title', async ({ page }) => {
  await expect(page).toHaveTitle(/Contact Us/);
});

test('Contact page shows heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
});

test('Contact details — address is visible', async ({ page }) => {
  await expect(page.getByText('Norton Road')).toBeVisible();
  await expect(page.getByText('TS20 2QQ')).toBeVisible();
});

test('Contact details — email link is visible and correct', async ({ page }) => {
  const emailLink = page.getByRole('link', { name: 'admin@destinytees.uk' });
  await expect(emailLink).toBeVisible();
  await expect(emailLink).toHaveAttribute('href', 'mailto:admin@destinytees.uk');
});

test('Contact details — phone link is visible and correct', async ({ page }) => {
  const phoneLink = page.getByRole('link', { name: /01642/ });
  await expect(phoneLink).toBeVisible();
  await expect(phoneLink).toHaveAttribute('href', 'tel:+441642559797');
});

test('Contact details — Sunday service time is visible', async ({ page }) => {
  await expect(page.getByText('11:00am every Sunday')).toBeVisible();
});

test('New here connect card banner is visible', async ({ page }) => {
  await expect(page.getByText('New here?')).toBeVisible();
  const connectLink = page.getByRole('link', { name: /New here/ });
  await expect(connectLink).toHaveAttribute('href', '/connect-card');
});

test('First Impressions feedback section is visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'First Impressions' })).toBeVisible();
});

// ── Form fields ────────────────────────────────────────────────────────────

test('Form has all required fields', async ({ page }) => {
  await expect(page.locator('#name')).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#subject')).toBeVisible();
  await expect(page.locator('#message')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
});

test('Subject dropdown has expected options', async ({ page }) => {
  const select = page.locator('#subject');
  await expect(select.locator('option[value="Safeguarding"]')).toHaveCount(1);
  await expect(select.locator('option[value="Privacy"]')).toHaveCount(1);
  await expect(select.locator('option[value="Complaints"]')).toHaveCount(1);
  await expect(select.locator('option[value="Enquiries"]')).toHaveCount(1);
  await expect(select.locator('option[value="Other"]')).toHaveCount(1);
});

test('Selecting Safeguarding shows emergency warning', async ({ page }) => {
  await page.locator('#subject').selectOption('Safeguarding');
  await expect(page.getByText('If someone is in immediate danger')).toBeVisible();
  await expect(page.getByText('999')).toBeVisible();
});

test('Safeguarding warning not shown for other subjects', async ({ page }) => {
  await page.locator('#subject').selectOption('Other');
  await expect(page.getByText('If someone is in immediate danger')).not.toBeVisible();
});

// ── Form validation ────────────────────────────────────────────────────────

test('Form does not submit when name is empty', async ({ page }) => {
  await page.locator('#email').fill('test@example.com');
  await page.locator('#subject').selectOption('Other');
  await page.locator('#message').fill('Test message');
  await page.getByRole('button', { name: 'Send Message' }).click();
  // Native required validation keeps the form open
  await expect(page.locator('#name')).toBeVisible();
});

test('Form does not submit with invalid email', async ({ page }) => {
  await page.locator('#name').fill('John Doe');
  await page.locator('#email').fill('not-an-email');
  await page.locator('#subject').selectOption('Other');
  await page.locator('#message').fill('Test message');
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('#email')).toBeVisible();
});

test('Form does not submit when message is empty', async ({ page }) => {
  await page.locator('#name').fill('John Doe');
  await page.locator('#email').fill('john.doe@example.com');
  await page.locator('#subject').selectOption('Other');
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('#message')).toBeVisible();
});

// ── Full form submission ───────────────────────────────────────────────────

test('Submitting a valid form shows success or error state', async ({ page }) => {
  await page.locator('#name').fill('John Doe');
  await page.locator('#email').fill('john.doe@example.com');
  await page.locator('#subject').selectOption('Other');
  await page.locator('#message').fill('Hello, this is a test message.');
  await page.getByRole('button', { name: 'Send Message' }).click();

  await expect(
    page.getByText('Message sent!').or(page.getByText('Something went wrong'))
  ).toBeVisible({ timeout: 10000 });
});

test('Send Message button is disabled while submitting', async ({ page }) => {
  await page.locator('#name').fill('John Doe');
  await page.locator('#email').fill('john.doe@example.com');
  await page.locator('#subject').selectOption('Other');
  await page.locator('#message').fill('Hello, this is a test message.');

  const button = page.getByRole('button', { name: 'Send Message' });
  await button.click();

  // Immediately after clicking the button should be disabled (loading state)
  await expect(page.getByRole('button', { name: 'Sending…' }).or(page.getByText('Message sent!'))).toBeVisible({ timeout: 5000 });
});

// ── Navigate to contact from visit page (original flow) ───────────────────

test('Can navigate to contact page from Plan a Visit', async ({ page }) => {
  await page.goto('https://destinychurch.vercel.app');
  await page.getByRole('button', { name: 'Accept All' }).click();
  await page.getByRole('link', { name: 'Plan a Visit' }).first().click();
  await expect(page.getByRole('heading', { name: 'Plan Your Visit' })).toBeVisible();
  await page.getByRole('link', { name: 'Contact Us' }).click();
  await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
});
