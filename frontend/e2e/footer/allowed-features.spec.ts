import { test, expect } from '@playwright/test';

test.describe("Allowed footer navigation tests", () => {
  test('Navigate To Landing Page', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'About Odyssey' }).click();
    await expect(page.getByRole('heading', { name: 'About Odyssey' })).toBeVisible();
  });

  test('Navigate to About Odyssey', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

    await page.getByRole('link', { name: 'About Odyssey' }).click();
    await expect(page.getByRole('heading', { name: 'About Odyssey' })).toBeVisible();
    await expect(page.getByText('Odyssey is an all-new on-')).toBeVisible();
  });

  test('Navigate to Features', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

  await page.getByRole('link', { name: 'Features' }).click();
  // if you want to assert that something is NOT visible for a user
  await expect(page.getByText('Gallery not found')).toBeHidden();
  });

  test('Navigate to Contributors', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

  await page.getByRole('link', { name: 'Contributors' }).click();
  await expect(page.getByRole('heading', { name: 'Website Creators' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Content Creators' })).toBeVisible();
  });
})
