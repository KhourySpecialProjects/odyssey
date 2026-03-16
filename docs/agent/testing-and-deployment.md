# Testing & Deployment

## Unit Tests (Jest)

### Running Tests

```bash
cd frontend && npm test                    # Run all Jest tests
cd frontend && npx jest <path>             # Run a specific test file
cd frontend && npx jest --watch            # Watch mode
cd frontend && npx jest --coverage         # Generate coverage report
```

Config: `frontend/jest.config.js` with `jest-environment-jsdom`. Setup file: `frontend/jest.setup.ts` (imports `@testing-library/jest-dom` matchers).

### Test Directory Structure

```
frontend/
├── testing/                    Unit test utilities and mocks
│   ├── mocks/                  Reusable mock data (droplets, enrollments, users, etc.)
│   └── requests/               Tests for lib/requests/ functions
│       ├── droplet.test.ts
│       ├── enrollment.test.ts
│       └── ...
├── tests/                      Component tests
│   └── components/
│       ├── droplets/
│       ├── dashboard/
│       └── ...
└── coverage/                   Generated coverage reports
```

### Testing Patterns

**Request function tests** — Mock `fetchAPI`, verify query params and response handling:

```typescript
// testing/requests/droplet.test.ts
jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

import { fetchAPI } from "@/lib/utils";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { CACHE_TAGS } from "@/lib/cache-tags";

describe("getDropletBySlug", () => {
  it("fetches a droplet with correct filters and cache tags", async () => {
    (fetchAPI as jest.Mock).mockResolvedValue([
      { id: 1, name: "Test", slug: "test" },
    ]);

    const result = await getDropletBySlug("test");

    expect(fetchAPI).toHaveBeenCalledWith(
      "/droplets",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: { slug: { $eq: "test" } },
        }),
        next: expect.objectContaining({
          tags: expect.arrayContaining([CACHE_TAGS.droplets]),
        }),
      }),
    );
    expect(result).toEqual({ id: 1, name: "Test", slug: "test" });
  });

  it("returns null when no droplet found", async () => {
    (fetchAPI as jest.Mock).mockResolvedValue([]);
    const result = await getDropletBySlug("nonexistent");
    expect(result).toBeNull();
  });
});
```

**Key point:** `fetchAPI` auto-flattens responses. Mock return values should be the already-flattened shape (plain objects, not wrapped in `{ data: { attributes: {} } }`).

**Component tests** — Render with Testing Library, mock actions and data:

```typescript
// tests/components/droplets/droplet-card.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions");
import { completeLesson } from "@/lib/actions";

describe("DropletCard", () => {
  const mockDroplet = { id: 1, name: "Test Droplet", slug: "test", type: "knowledge" };

  it("renders droplet name", () => {
    render(<DropletCard droplet={mockDroplet} />);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });

  it("calls action on button click", async () => {
    render(<DropletCard droplet={mockDroplet} />);
    await userEvent.click(screen.getByRole("button", { name: /complete/i }));
    await waitFor(() => {
      expect(completeLesson).toHaveBeenCalled();
    });
  });
});
```

**What to mock:**

- `@/lib/utils` → `fetchAPI` (for request function tests)
- `@/lib/actions` → individual Server Actions (for component tests)
- `next/navigation` → `useRouter`, `usePathname`, `redirect` (for routing tests)
- `next-auth/react` → `useSession` (for auth-dependent components)

**Reusable mock data** lives in `frontend/testing/mocks/`. Create mock factories for frequently used types rather than inline mock objects.

### Test Conventions

- One test file per source file, mirroring the source directory structure
- Test both happy path and error cases (`mockRejectedValue`, `{ ok: false }`)
- Run specific test files during development: `npx jest testing/requests/droplet.test.ts`
- Run full suite before submitting a pull request: `cd frontend && npm test`
- The quality-gate hook runs Prettier automatically, but does NOT run ESLint or tests — you must run those explicitly

## E2E Tests (Playwright)

### Running E2E Tests

```bash
cd frontend && npm run test:e2e           # Run all E2E tests (Firefox)
cd frontend && npx playwright test         # Run with default config
cd frontend && npx playwright test --ui    # Interactive UI mode
cd frontend && npx playwright show-report  # View HTML report
```

Config: `frontend/playwright.config.ts`. Default browser: Firefox.

### Test Organization by Role

```
frontend/e2e/
├── unauthorizedUser/      Tests for unauthenticated visitors
├── user/                  Tests for basic User role
├── faculty/               Tests for Faculty role
├── academicAdmin/         Tests for admin workflows
├── contentCreator/        Tests for content creation flows
├── contentEditor/         Tests for content editing flows
├── systemAdmin/           Tests for System Admin features
├── websiteCreator/        Tests for website-level features
├── footer/                Footer link tests
└── benchmarks/            Performance benchmark tests
```

Each role directory contains tests scoped to that role's permissions. Tests authenticate as the appropriate role before running.

### Reports

- Playwright HTML reports: `frontend/playwright-report/`
- Test results/artifacts: `frontend/test-results/`

## CI Pipeline

### What CI Runs (GitHub Actions)

The CI pipeline runs on pull requests to `develop` and `production`:

1. **Prettier** — Format check on all files
2. **ESLint** — Lint check on `frontend/app`, `frontend/components`, `frontend/lib`
3. **Jest** — All unit tests
4. **Frontend build** — `next build` (catches TypeScript errors)
5. **Backend build** — Strapi build

### Running CI Locally

Use the `/ci` slash command in Claude Code:

```
/ci          # Full pipeline: prettier + lint + tests + builds
/ci quick    # Skip builds, just prettier + lint + tests
```

The command runs each check sequentially, reports pass/fail with relevant output, and gives a final verdict (READY TO PUSH or NOT READY TO PUSH).

### Quality Gate Hook

The `quality-gate.sh` hook runs automatically after every agent turn (Stop and SubagentStop events):

- Auto-fixes formatting with Prettier on all changed files
- Does NOT run ESLint — a version mismatch between frontend and root ESLint configs causes plugin resolution errors
- Always exits 0 (never blocks the agent)
- Linting is checked by `npm run lint` in CI and the `/ci` command

This means formatting is always clean, but you must run linting and tests explicitly.

## Deployment

### Environments

| Environment | Frontend              | Backend (Strapi)           | Database          |
| ----------- | --------------------- | -------------------------- | ----------------- |
| Production  | khouryodyssey.org     | data.khouryodyssey.org     | AWS RDS           |
| Development | dev.khouryodyssey.org | dev.data.khouryodyssey.org | AWS RDS           |
| Local       | localhost:3000        | localhost:1337             | Docker PostgreSQL |

### Deployment Pipeline

1. Feature branches merge into `develop` via PR
2. `develop` deploys to dev environment automatically (GitHub Actions → Docker image → AWS ECS)
3. `develop` merges into `production` for production release
4. `production` deploys to production via the same pipeline

Docker images are built by GitHub Actions (`prod-image-push.yml`, `dev2-image-push.yml`) and pushed to a container registry. AWS ECS pulls the images and runs them behind an ALB with SSL termination.

### Infrastructure

Managed by Terraform in the `terraform/` directory. **Never modify Terraform files** — infrastructure changes go through a separate process.

- AWS ECS (Fargate) — container orchestration
- AWS ALB — load balancing with SSL
- AWS RDS (PostgreSQL) — database
- AWS S3 — media storage
- AWS CloudFront / CDN — media delivery

### Branch Strategy

```
production (live site)
  ↑ merge when ready
develop (staging)
  ↑ PR from feature branches
feature/description
bug/description
improvement/description
```

All work starts from `develop`. Branch naming: `feature/[description]`, `bug/[description]`, or `improvement/[description]`.

### Local Development

```bash
# First time setup
git clone -b develop https://github.com/KhourySpecialProjects/odyssey.git
cd odyssey
npm run setup          # Install all dependencies

# Running locally
docker compose build   # Build containers (first time or after dependency changes)
docker compose up      # Start all services (frontend :3000, backend :1337, PostgreSQL)

# Or without Docker (frontend + backend separately)
npm run dev            # Runs both via concurrently (clears .next first)
```

Environment variables: copy `.env.example` → `.env` (backend) and `.env.example` → `.env.local` (frontend). See README.md for detailed setup instructions including API key generation.
