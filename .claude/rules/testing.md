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
- Document ids are mocked globally: `5` becomes `"doc5"`. After `jest.resetAllMocks()` call `installDocumentIdMock()`.
- Mock a DELETE response with `makeEmptyResponse(204)`.

## Keep tests lean

Tests are reviewed too. Cover every behaviour, in as few lines as it takes.

- Cases that differ only in input and expected result go in one `it.each` table, not one copied `it` block per case. See `frontend/testing/requests/reviews-workflow.test.ts`.
- Build test data with a factory and overrides: `{ ...mockReview, state: "sent" }` from `frontend/testing/mocks/`, or `reviewData({ state: "sent" })` from `backend/tests/helpers/fixtures.js`. Don't paste whole objects into each test. Add a factory there when a type has none.
- Test each behaviour at the layer that owns it. A rule the Strapi route enforces (ownership, state, value limits) is tested in the backend route test. The server action's test covers only what the action adds: auth, the one call it makes, and revalidation.
- Shared setup goes in `beforeEach` or a small helper in the test file, not repeated in every test.
- Don't test what TypeScript or the framework already guarantees: types, constants, or a function that only passes its arguments on.
- No snapshot tests of large component trees. Assert the text, roles and calls that matter.
