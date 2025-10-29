import { test, expect } from "@playwright/test";


test.use({
  storageState: 'e2e/academicAdmin/auth.json'
});

test.describe("Academic Admin Navigation Tests", () => {
    test.use({
        storageState: 'e2e/academicAdmin/auth.json'
    });
    test("Navigate From Explore", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/");
        await expect(page.getByRole('link', { name: 'My Content' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'To Review' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
    });
    test("Navigate To My Content", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/my-content");
        await expect(page.getByRole('heading', { name: 'My Content' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Create a new Droplet or Playlist draft or edit an existing one.');
        await expect(page.getByRole('main')).toContainText('My Droplets');
        await expect(page.getByRole('main')).toContainText('My Playlists');
        await expect(page.getByRole('button', { name: 'New Droplet' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'New Playlist' })).toBeVisible();
    });
    test("Navigate To Review", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/review");
        await expect(page.getByRole('heading', { name: 'To Review' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Look over draft droplets that have been submitted for review.');
    });
    test("Navigate To Admin", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
        await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
        await expect(page.getByText('View Odyssey statistics and')).toBeVisible();
        await expect(page.getByRole('main')).toContainText('General Statistics');
    });
});

test.describe("Academic Admin Workflow Tests", () => {
    test.use({
        storageState: 'e2e/academicAdmin/auth.json'
    });
    test("Academic Admin New Droplet Workflow", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/my-content");
        await page.getByRole('button', { name: 'New Droplet' }).click();
        await page.goto("https://dev.khouryodyssey.org/new/droplet");
        await expect(page.getByRole('heading', { name: 'Create a Droplet' })).toBeVisible();
        await expect(page.getByText('Name *')).toBeVisible();
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: 'Personal' }).click();
        await expect(page.getByText('Focus Area *')).toBeVisible();
        await expect(page.getByLabel('Focus Area *').locator('button')).toContainText('Personal');
        await page.locator('html').click();
        await expect(page.getByText('Type *')).toBeVisible();
        await page.locator('div').filter({ hasText: /^Skill$/ }).getByRole('radio').click();
        await expect(page.getByRole('radiogroup')).toContainText('Skill');
        await page.getByRole('button', { name: 'Select Tags...' }).click();
        await page.getByRole('option', { name: 'Data Science' }).locator('div').click();
        await page.getByRole('option', { name: 'Ethics' }).locator('div').click();
        await page.getByText('Create a DropletMetadataName').click();
        await expect(page.locator('form')).toContainText('Data ScienceEthics');
        await expect(page.getByRole('heading', { name: 'Learning Objectives *' })).toBeVisible();
        await page.getByRole('textbox', { name: 'New Learning Objective...' }).click();
        await page.getByRole('textbox', { name: 'New Learning Objective...' }).fill('To learn the objective');
        await page.getByRole('listitem').filter({ hasText: /^$/ }).getByRole('button').click();
        await expect(page.locator('form')).toContainText('To learn the objective');
        await expect(page.getByRole('button', { name: 'Create Droplet' })).toBeVisible();
    });
    test("Academic Admin New Playlist Workflow", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/my-content");
        await page.getByRole('button', { name: 'New Playlist' }).click();
        await expect(page.getByRole('heading', { name: 'Create New Playlist' })).toBeVisible();
        await expect(page.getByText('Playlist Name *')).toBeVisible();
        await page.locator('div').filter({ hasText: /^Make this playlist public$/ }).locator('div').click();
        await expect(page.locator('div').filter({ hasText: /^Make this playlist public$/ }).locator('div')).toBeVisible();
        await expect(page.locator('h2')).toContainText('Select and Arrange Droplets');
        await expect(page.getByRole('form')).toContainText('0 droplets selected (0 lessons total)');
        await page.getByRole('searchbox', { name: 'Search Droplets...' }).click();
        await expect(page.getByRole('button', { name: 'Save Playlist' })).toBeVisible();
    });
    test("Academic Admin Admin Stats Navigation", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
        await page.locator('div').filter({ hasText: /^Daily Active Users$/ }).click();
        await page.goto("https://dev.khouryodyssey.org/admin?statsTab=Daily+Active+Users");
        await expect(page.locator('canvas')).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Weekly Active Users');
        await page.locator('div').filter({ hasText: /^Weekly Active Users$/ }).click();
        await expect(page.locator('canvas')).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Daily Unique Pageviews');
        await page.locator('div').filter({ hasText: /^Daily Unique Pageviews$/ }).click();
        await expect(page.locator('canvas')).toBeVisible();
        await page.locator('div').filter({ hasText: /^General Statistics$/ }).click();
        await expect(page.getByRole('main')).toContainText('Total Number of Users');
        await expect(page.getByRole('main')).toContainText('Total Number of Droplets');
        await expect(page.getByRole('main')).toContainText('Total Number of Enrollments');
        await expect(page.getByRole('main')).toContainText('Retention Rate');
    });
    test("Academic Admin Admin Users Navigation", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
        await expect(page.locator('div').filter({ hasText: /^Users$/ })).toBeVisible();
        await page.locator('div').filter({ hasText: /^Users$/ }).click();
        await expect(page.getByRole('main')).toContainText('Authorized Users');
        await expect(page.getByRole('main')).toContainText('The following users have access to this application.');
    });
    test("Academic Admin Admin Droplets Navigation", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
         await expect(page.locator('div').filter({ hasText: /^Droplets$/ })).toBeVisible();
        await page.locator('div').filter({ hasText: /^Droplets$/ }).click();
        await page.goto("https://dev.khouryodyssey.org/admin?statsTab=General+Statistics&adminTab=Droplets");
        await expect(page.getByRole('heading', { name: 'Droplets' })).toBeVisible();
        await expect(page.getByText('The following droplets have')).toBeVisible();
        await expect(page.getByTestId('create-droplet')).toBeVisible();
    });
    test("Academic Admin Admin Playlists Navigation", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
        await expect(page.getByRole('main')).toContainText('Playlists');
        await page.locator('div').filter({ hasText: /^Playlists$/ }).click();
        await expect(page.getByRole('heading', { name: 'Playlists' })).toBeVisible();
        await expect(page.getByText('The following playlists have')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create Playlist' })).toBeVisible();
    });
    test("Academic Admin Admin Groups Navigation", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
        await expect(page.getByRole('main')).toContainText('Groups');
        await expect(page.locator('div').filter({ hasText: /^Groups$/ })).toBeVisible();
        await page.locator('div').filter({ hasText: /^Groups$/ }).click();
        await page.goto("https://dev.khouryodyssey.org/admin?statsTab=General+Statistics&adminTab=Groups");
        await expect(page.getByRole('main')).toContainText('Groups');
        await expect(page.getByText('The following groups have')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create Group' })).toBeVisible();
    });
    test("Academic Admin Admin Access Manager Navigation", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
        await expect(page.getByRole('main')).toContainText('Access Manager');
        await page.locator('div').filter({ hasText: /^Access Manager$/ }).click();
        await expect(page.getByText('Batch Add User')).toBeVisible();
        await expect(page.getByText('Invite a new user by entering')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Batch Add Users' })).toBeVisible();
        await expect(page.getByText('Enter multiple email')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Access Requests' })).toBeVisible();
        await expect(page.getByText('The following individuals')).toBeVisible();
    });
    test("Academic Admin Admin Reports Navigation", async ({ page }) => {
        await page.goto("https://dev.khouryodyssey.org/admin");
        await page.locator('div').filter({ hasText: /^Reports$/ }).click();
        await page.goto("https://dev.khouryodyssey.org/admin?statsTab=General+Statistics&adminTab=Reports");
        await expect(page.getByRole('main')).toContainText('The following reports have been received from users.');
        await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Reports');
    });

    // test("Academic Admin Admin Tabs Navigation", async ({ page }) => {
    //     await page.goto("http://localhost:3000/admin");
    //     await expect(page.locator('div').filter({ hasText: /^Droplets$/ })).toBeVisible();
    //     await page.locator('div').filter({ hasText: /^Droplets$/ }).click();
    //     await page.goto("http://localhost:3000/admin?statsTab=General+Statistics&adminTab=Droplets");
    //     await expect(page.getByRole('heading', { name: 'Droplets' })).toBeVisible();
    //     await expect(page.getByText('The following droplets have')).toBeVisible();
    //     await expect(page.getByTestId('create-droplet')).toBeVisible();
    //     await expect(page.getByRole('main')).toContainText('Playlists');
    //     await page.locator('div').filter({ hasText: /^Playlists$/ }).click();
    //     await expect(page.getByRole('heading', { name: 'Playlists' })).toBeVisible();
    //     await expect(page.getByText('The following playlists have')).toBeVisible();
    //     await expect(page.getByRole('button', { name: 'Create Playlist' })).toBeVisible();
    //     await expect(page.getByRole('main')).toContainText('Groups');
    //     await expect(page.locator('div').filter({ hasText: /^Groups$/ })).toBeVisible();
    //     await page.locator('div').filter({ hasText: /^Groups$/ }).click();
    //     await page.goto("http://localhost:3000/admin?statsTab=General+Statistics&adminTab=Groups");
    //     await expect(page.getByRole('main')).toContainText('Groups');
    //     await expect(page.getByText('The following groups have')).toBeVisible();
    //     await expect(page.getByRole('button', { name: 'Create Group' })).toBeVisible();
    //     await expect(page.getByRole('main')).toContainText('Access Manager');
    //     await page.locator('div').filter({ hasText: /^Access Manager$/ }).click();
    //     await expect(page.getByRole('main')).toContainText('Add User');
    //     await expect(page.getByText('Invite a new user by entering')).toBeVisible();
    //     await expect(page.getByRole('heading', { name: 'Batch Add Users' })).toBeVisible();
    //     await expect(page.getByText('Enter multiple email')).toBeVisible();
    //     await expect(page.getByRole('heading', { name: 'Access Requests' })).toBeVisible();
    //     await expect(page.getByText('The following individuals')).toBeVisible();
    //     await page.locator('div').filter({ hasText: /^Reports$/ }).click();
    //     await page.goto("http://localhost:3000/admin?statsTab=General+Statistics&adminTab=Reports");
    //     await expect(page.getByRole('main')).toContainText('The following reports have been received from users.');
    //     await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    //     await expect(page.getByRole('main')).toContainText('Reports');
    // });
});



// test('test', async ({ page }) => {
//   await page.goto('http://localhost:3000/');
//   await expect(page.getByRole('link', { name: 'My Content' })).toBeVisible();
//   await expect(page.getByRole('link', { name: 'To Review' })).toBeVisible();
//   await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
//   await page.getByRole('link', { name: 'My Content' }).click();
//   await page.goto('http://localhost:3000/my-content');
//   await expect(page.getByRole('heading', { name: 'My Content' })).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Create a new Droplet or Playlist draft or edit an existing one.');
//   await expect(page.getByRole('main')).toContainText('My Droplets');
//   await expect(page.getByRole('main')).toContainText('My Playlists');
//   await expect(page.getByRole('button', { name: 'New Droplet' })).toBeVisible();
//   await expect(page.getByRole('button', { name: 'New Playlist' })).toBeVisible();
//   await page.getByRole('button', { name: 'New Droplet' }).click();
//   await expect(page.getByRole('heading', { name: 'Create a Droplet' })).toBeVisible();
//   await expect(page.getByText('Name *')).toBeVisible();
//   await page.getByRole('combobox').click();
//   await page.getByRole('option', { name: 'Personal' }).click();
//   await expect(page.getByText('Focus Area *')).toBeVisible();
//   await expect(page.getByLabel('Focus Area *').locator('button')).toContainText('Personal');
//   await page.locator('html').click();
//   await expect(page.getByText('Type *')).toBeVisible();
//   await page.locator('div').filter({ hasText: /^Skill$/ }).getByRole('radio').click();
//   await expect(page.getByRole('radiogroup')).toContainText('Skill');
//   await page.getByRole('button', { name: 'Select Tags...' }).click();
//   await page.getByRole('option', { name: 'Data Science' }).locator('div').click();
//   await page.getByRole('option', { name: 'Data Management' }).locator('div').click();
//   await page.getByText('Create a DropletMetadataName').click();
//   await expect(page.locator('form')).toContainText('Data ScienceData Management');
//   await expect(page.getByRole('heading', { name: 'Learning Objectives *' })).toBeVisible();
//   await page.getByRole('textbox', { name: 'New Learning Objective...' }).click();
//   await page.getByRole('textbox', { name: 'New Learning Objective...' }).fill('To learn the objective');
//   await page.getByRole('listitem').filter({ hasText: /^$/ }).getByRole('button').click();
//   await expect(page.locator('form')).toContainText('To learn the objective');
//   await expect(page.getByRole('button', { name: 'Create Droplet' })).toBeVisible();
//   await page.getByRole('link', { name: 'My Content' }).click();
//   await page.getByRole('button', { name: 'New Playlist' }).click();
//   await page.goto('http://localhost:3000/new/playlist');
//   await expect(page.getByRole('heading', { name: 'Create New Playlist' })).toBeVisible();
//   await expect(page.getByText('Playlist Name *')).toBeVisible();
//   await page.locator('div').filter({ hasText: /^Make this playlist public$/ }).locator('div').click();
//   await expect(page.locator('div').filter({ hasText: /^Make this playlist public$/ }).locator('div')).toBeVisible();
//   await expect(page.locator('h2')).toContainText('Select and Arrange Droplets');
//   await expect(page.getByRole('form')).toContainText('0 droplets selected (0 lessons total)');
//   await page.getByRole('searchbox', { name: 'Search Droplets...' }).click();
//   await expect(page.getByRole('button', { name: 'Save Playlist' })).toBeVisible();
//   await page.getByRole('link', { name: 'To Review' }).click();
//   await page.goto('http://localhost:3000/review');
//   await expect(page.getByRole('heading', { name: 'To Review' })).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Look over draft droplets that have been submitted for review.');
//   await page.getByRole('link', { name: 'Admin' }).click();
//   await page.goto('http://localhost:3000/admin');
//   await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
//   await expect(page.getByText('View Odyssey statistics and')).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('General Statistics');
//   await page.locator('div').filter({ hasText: /^Daily Active Users$/ }).click();
//   await page.goto('http://localhost:3000/admin?statsTab=Daily+Active+Users');
//   await expect(page.locator('canvas')).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Weekly Active Users');
//   await page.locator('div').filter({ hasText: /^Weekly Active Users$/ }).click();
//   await expect(page.locator('canvas')).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Daily Unique Pageviews');
//   await page.locator('div').filter({ hasText: /^Daily Unique Pageviews$/ }).click();
//   await expect(page.locator('canvas')).toBeVisible();
//   await page.locator('div').filter({ hasText: /^General Statistics$/ }).click();
//   await expect(page.getByRole('main')).toContainText('Total Number of Users');
//   await expect(page.getByRole('main')).toContainText('Total Number of Droplets');
//   await expect(page.getByRole('main')).toContainText('Total Number of Enrollments');
//   await expect(page.getByRole('main')).toContainText('Retention Rate');
//   await expect(page.locator('div').filter({ hasText: /^Users$/ })).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Authorized Users');
//   await expect(page.getByRole('main')).toContainText('The following users have access to this application.');
//   await expect(page.locator('div').filter({ hasText: /^Droplets$/ })).toBeVisible();
//   await page.locator('div').filter({ hasText: /^Droplets$/ }).click();
//   await expect(page.getByRole('heading', { name: 'Droplets' })).toBeVisible();
//   await expect(page.getByText('The following droplets have')).toBeVisible();
//   await expect(page.getByTestId('create-droplet')).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Playlists');
//   await page.locator('div').filter({ hasText: /^Playlists$/ }).click();
//   await expect(page.getByRole('heading', { name: 'Playlists' })).toBeVisible();
//   await expect(page.getByText('The following playlists have')).toBeVisible();
//   await expect(page.getByRole('button', { name: 'Create Playlist' })).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Groups');
//   await expect(page.locator('div').filter({ hasText: /^Groups$/ })).toBeVisible();
//   await page.locator('div').filter({ hasText: /^Groups$/ }).click();
//   await page.goto('http://localhost:3000/admin?statsTab=General+Statistics&adminTab=Groups');
//   await expect(page.getByRole('main')).toContainText('Groups');
//   await expect(page.getByText('The following groups have')).toBeVisible();
//   await expect(page.getByRole('button', { name: 'Create Group' })).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Access Manager');
//   await page.locator('div').filter({ hasText: /^Access Manager$/ }).click();
//   await expect(page.getByRole('main')).toContainText('Add User');
//   await expect(page.getByText('Invite a new user by entering')).toBeVisible();
//   await expect(page.getByRole('heading', { name: 'Batch Add Users' })).toBeVisible();
//   await expect(page.getByText('Enter multiple email')).toBeVisible();
//   await expect(page.getByRole('heading', { name: 'Access Requests' })).toBeVisible();
//   await expect(page.getByText('The following individuals')).toBeVisible();
//   await page.locator('div').filter({ hasText: /^Reports$/ }).click();
//   await page.goto('http://localhost:3000/admin?statsTab=General+Statistics&adminTab=Reports');
//   await expect(page.getByRole('main')).toContainText('The following reports have been received from users.');
//   await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
//   await expect(page.getByRole('main')).toContainText('Reports');
//   await page.getByRole('banner').getByRole('img').nth(1).click();
//   await page.getByTestId('settings-link').click();
//   await page.goto('http://localhost:3000/settings');
//   await expect(page.getByRole('main')).toContainText('User, Academic Admin');
// });