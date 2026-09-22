---
name: testing-patterns
description: Jest testing patterns for the Odyssey frontend. Use when writing unit tests, fixing test failures, or setting up mocks. Covers fetchAPI mocking, Server Action mocking, next-auth mocking, component testing with RTL, and mock data conventions.
invocation: auto
---

# Testing Patterns for Odyssey

## Test File Locations

```
frontend/
├── testing/
│   ├── requests/         Request function tests (.js and .ts files)
│   ├── mocks/            Shared mock data (enrollmentsMock.js, authorizedUsersMock.js, etc.)
│   └── utils/            Test utilities
```

## The Four Mock Patterns

### 1. Mocking fetchAPI (for request function tests)

```typescript
import { CACHE_TAGS } from "@/lib/cache-tags";

// Mock at module level — fetchAPI auto-flattens, so mock returns FLAT data
jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

import { fetchAPI } from "@/lib/utils";
import { getDropletBySlug } from "@/lib/requests/droplet";

describe("getDropletBySlug", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches a droplet by slug with correct params", async () => {
    const mockDroplet = { id: 1, name: "Test", slug: "test-droplet" };
    (fetchAPI as jest.Mock).mockResolvedValue([mockDroplet]);

    const result = await getDropletBySlug("test-droplet");

    expect(fetchAPI).toHaveBeenCalledWith("/droplets", {
      urlParams: expect.objectContaining({
        filters: { slug: { $eq: "test-droplet" } },
      }),
      next: expect.objectContaining({
        tags: expect.arrayContaining([CACHE_TAGS.droplets]),
      }),
    });
    expect(result).toEqual(mockDroplet);
  });

  it("returns null when no droplet found", async () => {
    (fetchAPI as jest.Mock).mockResolvedValue([]);
    const result = await getDropletBySlug("nonexistent");
    expect(result).toBeNull();
  });
});
```

**Key rule:** `fetchAPI` returns FLAT data (already flattened). Never mock it with nested `{ data: { attributes: {} } }` format.

### 2. Mocking Server Actions (for component tests)

```typescript
jest.mock("@/lib/actions", () => ({
  completeLesson: jest.fn(),
  rateDroplet: jest.fn(),
  createEnrollment: jest.fn(),
}));

import { completeLesson } from "@/lib/actions";
```

### 3. Mocking next-auth (for components that check session)

```typescript
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        strapiUserId: 42,
        roles: [{ name: "User" }],
        name: "Test User",
      },
    },
    status: "authenticated",
  })),
}));
```

### 4. Mocking next/navigation (for components that use router)

```typescript
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
```

## Mock Data Conventions

Shared mock data lives in `frontend/testing/mocks/`. Actual files:

```
testing/mocks/
├── authorizedUsersMock.js
├── enrollmentsMock.js
├── groupsMock.js
├── notesMock.js
└── strapiMock.js
```

**Rules:**

- One mock file per content type, named `{type}Mock.js` (JavaScript, not TypeScript)
- Some mocks use **nested Strapi format** (`{ id, attributes: {} }`) for testing the flatten path — these are passed through `flattenAttributes()` in the test itself
- When mocking `fetchAPI` return values, use flat data (fetchAPI auto-flattens)
- When testing functions that call raw `fetch()` + `flattenAttributes()`, use nested format
- Override specific fields in individual tests: `{ ...mockEnrollment, rating: 5 }`

## Component Testing with React Testing Library

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("DropletCard", () => {
  it("renders droplet name and description", () => {
    render(<DropletCard droplet={mockDroplet} />);
    expect(screen.getByText("Introduction to Python")).toBeInTheDocument();
    expect(screen.getByText("Learn Python basics")).toBeInTheDocument();
  });

  it("navigates to droplet page on click", async () => {
    render(<DropletCard droplet={mockDroplet} />);
    await userEvent.click(screen.getByRole("link"));
    expect(mockPush).toHaveBeenCalledWith("/d/intro-to-python");
  });

  it("shows enrollment button for unenrolled users", () => {
    render(<DropletCard droplet={mockDroplet} enrollment={null} />);
    expect(screen.getByRole("button", { name: /enroll/i })).toBeInTheDocument();
  });
});
```

**Query priority (most to least preferred):**

1. `getByRole` — accessible, tests what users see
2. `getByText` — for static content
3. `getByLabelText` — for form fields
4. `getByTestId` — last resort, add `data-testid` sparingly

## Testing Async Behavior

```typescript
it("shows loading then results", async () => {
  (fetchAPI as jest.Mock).mockResolvedValue(mockDroplets);
  render(<ExploreResults />);

  // Wait for async render
  await waitFor(() => {
    expect(screen.getByText("Introduction to Python")).toBeInTheDocument();
  });
});

it("shows error state on failure", async () => {
  (fetchAPI as jest.Mock).mockRejectedValue(new Error("Network error"));
  render(<ExploreResults />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Patterns from Actual Test Files

The real test files use additional patterns not shown above:

```typescript
// Mock global.fetch for Server Action mutation tests
global.fetch = jest.fn();

// Silence console noise in tests
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// Mock next/cache for revalidation
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// CommonJS require syntax (used in .js test files)
const {
  getEnrollmentsByAuthorizedUser,
} = require("../../lib/requests/enrollment");
const { flattenAttributes, fetchAPI } = require("../../lib/utils");
```

**Note:** Test files may be `.js` or `.ts`. Follow the existing convention in the directory you're working in.

## Running Tests

```bash
# Single test file
cd frontend && npx jest testing/requests/droplet.test.ts

# All tests in a directory
cd frontend && npx jest testing/requests/

# With coverage
cd frontend && npx jest --coverage testing/requests/droplet.test.ts

# Watch mode (during development)
cd frontend && npx jest --watch testing/requests/droplet.test.ts

# Full suite
cd frontend && npm test
```

## Common Test Mistakes

1. **Mocking fetchAPI with nested Strapi format** — `fetchAPI` returns flat data. Mock with flat objects.
2. **Forgetting `jest.clearAllMocks()` in beforeEach** — Stale mocks leak between tests.
3. **Testing implementation details** — Test what the user sees (text, roles, behavior), not internal state.
4. **Missing `await` on userEvent calls** — `userEvent.click()` is async in v14+.
5. **Using `getByTestId` first** — Prefer `getByRole` for accessibility-driven tests.
6. **Testing Server Components with `render()`** — Server Components with async data fetching can't be tested with RTL directly. Test the request function separately, then test the component with mocked data passed as props.
