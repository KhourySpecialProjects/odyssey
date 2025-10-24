import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'About Odyssey' }).click();
  await expect(page.getByRole('heading', { name: 'About Odyssey' })).toBeVisible();
});