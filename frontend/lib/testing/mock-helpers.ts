/**
 * Shared typed test helpers.
 *
 * Usage:
 *   import { makeDroplet, makeTag, mockGlobalFetch, assertOk } from "@/lib/testing/mock-helpers";
 *
 * These helpers exist so test files can use proper TypeScript-safe patterns
 * without resorting to `as jest.Mock` or `as any` casts.
 */

import { DateTime } from "luxon";
import type {
  AuthorizedUser,
  Droplet,
  DropletDifficulty,
  DueDate,
  Enrollment,
  Group,
  GroupSemester,
  Lesson,
  Tag,
} from "@/types";
import { fetchAPI } from "@/lib/utils";

// ---------------------------------------------------------------------------
// fetchAPI typed mock wrapper
// ---------------------------------------------------------------------------

/**
 * Returns a typed jest.MockedFunction wrapper for fetchAPI.
 *
 * Use this instead of `fetchAPI as jest.Mock` — jest.mocked() is Jest's
 * official API for narrowing a mock to its typed variant.
 *
 * Requires `jest.mock("@/lib/utils")` or `jest.mock("../../lib/utils")`
 * to be called in the same test file.
 */
export function getMockedFetchAPI() {
  return jest.mocked(fetchAPI);
}

// ---------------------------------------------------------------------------
// global.fetch typed mock factory
// ---------------------------------------------------------------------------

/**
 * Creates a typed jest.MockedFunction<typeof fetch> and assigns it to
 * global.fetch. Returns the mock so callers can set up return values.
 *
 * Prefer this over `global.fetch = jest.fn()` (untyped) because
 * TypeScript's `global.fetch` is typed as the real `fetch` interface,
 * which doesn't have `.mockResolvedValueOnce` etc.
 */
export function mockGlobalFetch(): jest.MockedFunction<typeof fetch> {
  const mock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  global.fetch = mock;
  return mock;
}

/**
 * Constructs a Response-compatible object for use with mockGlobalFetch().
 *
 * Uses the native `Response` constructor when available (Node 18+, browsers).
 * Falls back to a plain object that implements the subset of the Response API
 * used by production code (`.ok`, `.status`, `.json()`) when the global
 * `Response` constructor is unavailable (e.g. jsdom test environments on
 * older Node versions).
 *
 * @param body - The JSON-serialisable response body
 * @param status - HTTP status code (default 200)
 */
export function makeFetchResponse(body: unknown, status = 200): Response {
  const jsonBody = JSON.stringify(body);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (typeof (globalThis as any).Response === "function") {
    return new (globalThis as any).Response(jsonBody, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  // Fallback: plain object matching the Response properties production code uses.
  const hdrs =
    typeof Headers === "function"
      ? new Headers({ "Content-Type": "application/json" })
      : ({
          get: (k: string) =>
            k === "Content-Type" ? "application/json" : null,
        } as unknown as Headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(jsonBody),
    text: async () => jsonBody,
    headers: hdrs,
  } as unknown as Response;
}

/**
 * Constructs a failed (ok=false) Response-compatible object.
 */
export function makeFetchErrorResponse(body: unknown, status = 400): Response {
  return makeFetchResponse(body, status);
}

// ---------------------------------------------------------------------------
// Server Action result assertion helper
// ---------------------------------------------------------------------------

/**
 * Assertion helper that narrows `{ ok: boolean; data: T | null }` to
 * `{ ok: true; data: T }` so tests can access `.data` without null checks.
 *
 * Throws a descriptive error if the result is not ok or data is null,
 * which surfaces as a test failure with a clear message.
 */
export function assertOk<T>(result: {
  ok: boolean;
  error?: unknown;
  data: T | null;
}): asserts result is { ok: true; data: T } {
  if (!result.ok) {
    throw new Error(
      `Expected ok result but got error: ${JSON.stringify(result.error ?? "unknown")}`,
    );
  }
  if (result.data === null) {
    throw new Error("Expected data but got null");
  }
}

// ---------------------------------------------------------------------------
// Droplet test factory
// ---------------------------------------------------------------------------

/**
 * Creates a minimal valid Tag fixture with sensible defaults.
 * Pass overrides to customise specific fields for the test at hand.
 */
export function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 1,
    name: "Test Tag",
    slug: "test-tag",
    droplets: [],
    ...overrides,
  };
}

/**
 * Creates a minimal valid Droplet fixture with sensible defaults.
 * Pass overrides to customise specific fields for the test at hand.
 *
 * This factory exists because the `Droplet` type has required fields
 * (e.g. `difficulty`) that were added after many test fixtures were written.
 * Using this factory means test fixtures stay valid as the type evolves.
 */
export function makeDroplet(overrides: Partial<Droplet> = {}): Droplet {
  return {
    id: 1,
    slug: "test-droplet",
    name: "Test Droplet",
    type: "knowledge",
    focusArea: "technical",
    difficulty: "beginner" as DropletDifficulty,
    status: "published",
    isHidden: false,
    learningObjectives: [],
    tags: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Lesson test factory
// ---------------------------------------------------------------------------

/**
 * Creates a minimal valid Lesson fixture with sensible defaults.
 */
export function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    type: "lesson",
    blocks: [],
    droplets: [],
    notes: "",
    orderIndex: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AuthorizedUser test factory
// ---------------------------------------------------------------------------

/**
 * Creates a minimal valid AuthorizedUser fixture with sensible defaults.
 * Pass overrides to customise specific fields for the test at hand.
 *
 * Note: `id: 0` is a falsy id — useful for testing "authorized user not found"
 * branches where the code checks `if (!authorizedUser?.id)`.
 */
export function makeAuthorizedUser(
  overrides: Partial<AuthorizedUser> = {},
): AuthorizedUser {
  return {
    id: 1,
    email: "user@example.com",
    roles: [],
    isEnabled: true,
    isPublic: false,
    linkedin: "",
    github: "",
    website: "",
    firstTime: false,
    firstName: "Test",
    lastName: "User",
    bio: "",
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York",
    groups: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Group test factory (minimal, for use in DueDate fixtures)
// ---------------------------------------------------------------------------

export function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "Spring 2025" as GroupSemester,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DueDate test factory
// ---------------------------------------------------------------------------

/**
 * Creates a minimal valid DueDate fixture with sensible defaults.
 * The `dueDate` field is a luxon DateTime; pass an ISO string to override:
 *   makeDueDate({ dueDate: DateTime.fromISO("2024-03-20T15:00:00.000Z") })
 */
export function makeDueDate(overrides: Partial<DueDate> = {}): DueDate {
  return {
    dueDate: DateTime.fromISO("2024-01-01T00:00:00.000Z"),
    authorized_user: {
      id: 1,
      email: "user@example.com",
      roles: [],
      isEnabled: true,
      isPublic: false,
      linkedin: "",
      github: "",
      website: "",
      firstTime: false,
      firstName: "Test",
      lastName: "User",
      bio: "",
      friendships: [],
      sent_requests: [],
      received_requests: [],
      profilePhoto: "",
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York",
      groups: [],
    },
    group: makeGroup(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Enrollment test factory
// ---------------------------------------------------------------------------

/**
 * Creates a minimal valid Enrollment fixture with sensible defaults.
 */
export function makeEnrollment(
  overrides: Partial<Enrollment> = {},
): Enrollment {
  return {
    id: "enrollment-1",
    authorizedUser: {
      id: 1,
      email: "user@example.com",
      roles: [],
      isEnabled: true,
      isPublic: false,
      linkedin: "",
      github: "",
      website: "",
      firstTime: false,
      firstName: "Test",
      lastName: "User",
      bio: "",
      friendships: [],
      sent_requests: [],
      received_requests: [],
      profilePhoto: "",
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York",
      groups: [],
    },
    droplet: makeDroplet(),
    viewedLessons: [],
    isComplete: false,
    rating: 0,
    isFirstTime: false,
    isArchived: false,
    notes: [],
    completionDate: new Date(),
    ...overrides,
  };
}
