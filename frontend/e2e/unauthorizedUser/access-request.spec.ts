import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'request access', exact: true }).click();
  await page.getByRole('textbox', { name: 'Given/First Name' }).click();
  await page.getByRole('textbox', { name: 'Given/First Name' }).fill('Johan');
  await page.getByRole('textbox', { name: 'Given/First Name' }).press('Tab');
  await page.getByRole('textbox', { name: 'Given/First Name' }).dblclick();
  await page.getByRole('textbox', { name: 'Given/First Name' }).fill('Jazz');
  await page.getByRole('textbox', { name: 'Given/First Name' }).press('Tab');
  await page.getByRole('textbox', { name: 'Family/Last Name' }).fill('Bot');
  await page.getByRole('textbox', { name: 'Family/Last Name' }).press('Tab');
  await page.getByRole('textbox', { name: 'Email' }).fill('ja.zz.bot.play@gmail.com');
  await page.getByRole('combobox', { name: 'Affiliation' }).click();
  await page.getByLabel('Undergraduate Student').getByText('Undergraduate Student').click();
  await page.getByRole('combobox', { name: 'College' }).click();
  await page.getByLabel('Khoury College of Computer').getByText('Khoury College of Computer').click();
  await page.getByRole('button', { name: 'Submit Request' }).click();
  await expect(page.getByText('Uh oh! Something went wrong.')).toBeVisible();
  await page.getByRole('region', { name: 'Notifications alt+T' }).getByRole('listitem').click();
});