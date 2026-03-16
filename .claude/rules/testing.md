---
paths:
  - "frontend/testing/**"
  - "frontend/tests/**"
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.test.js"
---

# Testing Rules

- Mock `fetchAPI` with FLAT data (already flattened). Never mock with nested `{ data: { attributes: {} } }`.
- Mock Server Actions: `jest.mock("@/lib/actions")`.
- Mock next-auth: `jest.mock("next-auth/react")` with session object.
- Mock next/navigation: `jest.mock("next/navigation")` with push/refresh/pathname.
- Shared mock data lives in `frontend/testing/mocks/` — one file per content type.
- Always `jest.clearAllMocks()` in `beforeEach`.
- Prefer `getByRole` > `getByText` > `getByLabelText` > `getByTestId`.
- Run specific tests: `cd frontend && npx jest path/to/test.ts`.
