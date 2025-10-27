import { test, expect } from "@playwright/test";

test.describe("Unauthorized Navigation Tests", () => {
    test.use({
        storageState: 'e2e/unauthorizedUser/auth.json'
    });

    test('Navigate to Unauthorized Page', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

    await page.getByRole('button', { name: 'Log in with GitHub' }).click();
    await expect(page.getByRole('heading', { name: 'Unauthorized' })).toBeVisible();
    await expect(page.getByText('Error')).toBeVisible();
    await expect(page.getByText('You do not have permission to')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request Access', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore the Odyssey' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'request access', exact: true })).toBeVisible();
    await expect(page.getByText('Ready to join the Odyssey?')).toBeVisible();
    });
    
    test('Naviagte to Request Access', async ({ page }) => {
        await page.goto('http://localhost:3000/');
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('button', { name: 'Log in' }).click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('button', { name: 'Log in with GitHub' }).click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('link', { name: 'Request Access', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Request Access' })).toBeVisible();
        await expect(page.getByText('Currently, only a limited')).toBeVisible();
    });
});

test.describe("Unauthorized Workflow Tests", () => {

    test.use({
    storageState: 'e2e/unauthorizedUser/auth.json'
    });

    test('Submitting Unique Request Access Flow', async ({ page }) => {
        // Generate a unique email using timestamp
        const uniqueEmail = `j.almanzar+test${Date.now()}@northeastern.edu`;
        
        // Mock the API endpoint to accept the unique email
        await page.route('*/**/api/access-requests', async route => {
            const request = route.request();
            const postData = request.postDataJSON();
            
            // Mock a successful response
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: Math.floor(Math.random() * 10000),
                    email: postData.email,
                    firstName: postData.firstName,
                    lastName: postData.lastName,
                    status: 'pending'
                })
            });
        });

        await page.goto('http://localhost:3000/');
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('button', { name: 'Log in' }).click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('button', { name: 'Log in with GitHub' }).click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('link', { name: 'Request Access', exact: true }).click();
        
        await page.getByRole('textbox', { name: 'Given/First Name' }).click();
        await page.getByRole('textbox', { name: 'Given/First Name' }).fill('Johan');
        await page.getByRole('textbox', { name: 'Family/Last Name' }).click();
        await page.getByRole('textbox', { name: 'Family/Last Name' }).fill('Almanzar');
        await page.getByRole('textbox', { name: 'Email' }).click();
        await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail); // Use unique email
        await page.getByRole('combobox', { name: 'Affiliation' }).click();
        await expect(page.getByRole('option', { name: 'Undergraduate Student' })).toBeVisible();

        await page.getByLabel('Undergraduate Student').getByText('Undergraduate Student').click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('combobox', { name: 'College' }).click();
        await expect(page.getByRole('option', { name: 'Bouvé College of Health' })).toBeVisible();

        await page.getByLabel('Khoury College of Computer').getByText('Khoury College of Computer').click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('button', { name: 'Submit Request' }).click();
        await expect(page.getByRole('heading', { name: 'Reinforce Your Learning and' })).toBeVisible();
    });

    test('Submitting Repeated Request Access Flow', async ({ page }) => {
        await page.goto('http://localhost:3000/');
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('link', { name: 'request access', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Submit Request' })).toBeVisible();

        await page.getByRole('textbox', { name: 'Given/First Name' }).click();
        await page.getByRole('textbox', { name: 'Given/First Name' }).fill('Johan');
        await page.getByRole('textbox', { name: 'Family/Last Name' }).click();
        await page.getByRole('textbox', { name: 'Family/Last Name' }).fill('Almanzar');
        await page.getByRole('textbox', { name: 'Email' }).click();
        await page.getByRole('textbox', { name: 'Email' }).fill('j.almanzar@northeastern.edu');
        await page.getByRole('combobox', { name: 'Affiliation' }).click();
        await expect(page.getByRole('option', { name: 'Undergraduate Student' })).toBeVisible();

        await page.getByLabel('Undergraduate Student').getByText('Undergraduate Student').click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('combobox', { name: 'College' }).click();
        await expect(page.getByRole('option', { name: 'Bouvé College of Health' })).toBeVisible();

        await page.getByLabel('Khoury College of Computer').getByText('Khoury College of Computer').click();
        await expect(page.getByRole('link', { name: 'Khoury Odyssey Logo Odyssey,' })).toBeVisible();

        await page.getByRole('button', { name: 'Submit Request' }).click();
        await expect(page.getByText('Uh oh! Something went wrong.')).toBeVisible();
        await expect(page.getByText('This attribute must be unique')).toBeVisible();
    });
});
