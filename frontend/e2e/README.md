# E2E Tests — Playwright

End-to-end tests for Odyssey, organized by user role.

## Directory Structure

```
e2e/
  fixtures.ts             # Shared test utilities (BASE_URL, helpers)
  public/                 # Tests for unauthenticated pages (no auth.json needed)
  footer/                 # Footer navigation and bug report flow
  unauthorizedUser/       # Tests for users without app access
  user/                   # Tests for regular authenticated users
  contentCreator/         # Tests for content creator role
  contentEditor/          # Tests for content editor role
  faculty/                # Tests for faculty role
  systemAdmin/            # Tests for system admin role
```

Each role directory contains:

- `allowed-features.spec.ts` — Pages and workflows the role CAN access
- `blocked-features.spec.ts` — Pages and workflows the role should NOT access
- `auth.json` — Saved authentication state (gitignored, must be generated locally)

## Prerequisites

1. **Playwright installed**: `npx playwright install`
2. **Docker** (for running tests via Docker Compose)
3. **Dev server running** at `https://dev.khouryodyssey.org/`

## Generating Auth State

Role-based tests require an `auth.json` file with saved session cookies. Generate one per role using the `save:*` scripts.

### Step-by-step:

1. **Run the save script** for the role you need:

   ```bash
   cd frontend
   npm run save:user           # Opens codegen browser — log in as a regular user
   npm run save:systemAdmin    # Log in as a system admin
   npm run save:contentCreator # Log in as a content creator
   # etc.
   ```

2. **Log in via the browser** that opens. The codegen tool records your session.

3. **Close the browser** when done. This saves `auth.json` to the role's directory.

4. **Verify** the auth state works:
   ```bash
   npm run load:user           # Opens codegen with saved auth — should show logged-in state
   ```

### Available save/load scripts:

| Script                        | Role              |
| ----------------------------- | ----------------- |
| `npm run save:unauth`         | Unauthorized user |
| `npm run save:user`           | Regular user      |
| `npm run save:contentCreator` | Content Creator   |
| `npm run save:contentEditor`  | Content Editor    |
| `npm run save:faculty`        | Faculty           |
| `npm run save:systemAdmin`    | System Admin      |

## Running Tests

### All E2E tests (via Docker):

```bash
cd frontend
npm run test:e2e
```

### Tests by role/category:

```bash
npm run test:e2e-public          # Public pages (no auth needed)
npm run test:e2e-footer          # Footer tests
npm run test:e2e-unauth          # Unauthorized user tests
npm run test:e2e-user            # Regular user tests
npm run test:e2e-systemAdmin     # System admin tests
npm run test:e2e-contentCreator  # Content creator tests
npm run test:e2e-contentEditor   # Content editor tests
npm run test:e2e-faculty         # Faculty tests
```

### Run locally (without Docker):

```bash
cd frontend
npx playwright test                          # All tests
npx playwright test e2e/public/              # Public tests only
npx playwright test e2e/public/explore.spec.ts  # Single file
npx playwright test --grep "Explore"         # By test name
```

### View test report:

```bash
npm run e2e:show
```

### Generate new tests interactively:

```bash
npm run test:codegen    # Opens Playwright codegen on dev site
```

## Writing Tests

### Patterns

- Use `page.getByRole()` for accessibility-first selectors
- Use `expect().toBeVisible()` / `toContainText()` for assertions
- Use `page.route()` to mock API responses when testing form submissions
- Use `test.use({ storageState: "e2e/<role>/auth.json" })` for authenticated tests

### Example — Navigation test:

```typescript
import { test, expect } from "@playwright/test";

const BASE_URL = "https://dev.khouryodyssey.org";

test.describe("My Feature Tests", () => {
  test.use({
    storageState: "e2e/user/auth.json",
  });

  test("can navigate to settings", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await expect(
      page.getByRole("heading", { name: /Profile|Settings/i }),
    ).toBeVisible();
  });
});
```

### Example — Form workflow with API mock:

```typescript
test("submit form with mocked API", async ({ page }) => {
  await page.route("*/**/api/my-endpoint", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto(`${BASE_URL}/my-form`);
  await page.getByRole("textbox", { name: "Name" }).fill("Test User");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Success")).toBeVisible();
});
```

## Configuration

Playwright config is at `frontend/playwright.config.ts`:

- **Browser**: Firefox (Chromium and Safari available but commented out)
- **Parallelism**: Full parallel, 80% workers on CI
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 30 seconds
- **Traces**: Captured on first retry
- **Screenshots**: Captured on failure only
