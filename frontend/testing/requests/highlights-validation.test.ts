// Input validation for the highlight write actions (ODY-785 review, S1).
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
} from "@/lib/requests/highlights";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { authFixtures } from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedRevalidateTag = jest.mocked(revalidateTag);

const invalid = { ok: false, error: "invalid", data: null };

const validCreate = {
  text: "beta",
  position: { start: 6, end: 10 },
  color: "#f9a8d4" as const,
  blockId: 3,
  lessonId: 2,
};

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
});

function expectNothingSent() {
  expect(fetchMock).not.toHaveBeenCalled();
  expect(mockedFetchAPI).not.toHaveBeenCalled();
  expect(mockedRevalidateTag).not.toHaveBeenCalled();
}

const badPositions: [string, { start: number; end: number }][] = [
  ["negative start", { start: -1, end: 4 }],
  ["start equal to end", { start: 4, end: 4 }],
  ["start after end", { start: 5, end: 4 }],
  ["fractional", { start: 1.5, end: 4 }],
  ["NaN", { start: NaN, end: 4 }],
  ["Infinity", { start: 0, end: Infinity }],
  ["unsafe integer", { start: 0, end: Number.MAX_SAFE_INTEGER + 2 }],
];

const badIds: [string, number][] = [
  ["zero", 0],
  ["negative (a pending temp id)", -3],
  ["fractional", 1.5],
  ["NaN", NaN],
  ["unsafe", Number.MAX_SAFE_INTEGER + 2],
];

describe("createHighlight validation", () => {
  it.each(badPositions)(
    "rejects a position that is %s",
    async (_n, position) => {
      const result = await createHighlight({ ...validCreate, position });
      expect(result).toEqual(invalid);
      expectNothingSent();
    },
  );

  it("rejects a colour outside the five highlight colours", async () => {
    const result = await createHighlight({
      ...validCreate,
      color: "red" as never,
    });
    expect(result).toEqual(invalid);
    expectNothingSent();
  });
});

describe("updateHighlight validation", () => {
  it.each(badIds)("rejects an id that is %s", async (_n, id) => {
    const result = await updateHighlight(id, { color: "#86efac" });
    expect(result).toEqual(invalid);
    expectNothingSent();
  });

  it("rejects a colour outside the five highlight colours", async () => {
    const result = await updateHighlight(5, { color: "#000000" as never });
    expect(result).toEqual(invalid);
    expectNothingSent();
  });

  it.each(badPositions)(
    "rejects a position that is %s",
    async (_n, position) => {
      const result = await updateHighlight(5, { position });
      expect(result).toEqual(invalid);
      expectNothingSent();
    },
  );
});

describe("deleteHighlight validation", () => {
  it.each(badIds)("rejects an id that is %s", async (_n, id) => {
    const result = await deleteHighlight(id);
    expect(result).toEqual(invalid);
    expectNothingSent();
  });
});

describe("the rest of the input", () => {
  const badInputs: [string, unknown][] = [
    ["null", null],
    ["undefined", undefined],
    ["a string", "text"],
    ["an array", []],
  ];

  it.each(badInputs)(
    "createHighlight rejects %s as the input, without throwing",
    async (_n, input) => {
      const result = await createHighlight(
        input as Parameters<typeof createHighlight>[0],
      );
      expect(result).toEqual(invalid);
      expectNothingSent();
    },
  );

  it.each(badInputs)(
    "updateHighlight rejects %s as the changes, without throwing",
    async (_n, changes) => {
      const result = await updateHighlight(
        5,
        changes as Parameters<typeof updateHighlight>[1],
      );
      expect(result).toEqual(invalid);
      expectNothingSent();
    },
  );

  const badCreateFields: [string, Partial<typeof validCreate>][] = [
    ["a lesson id of 0", { lessonId: 0 }],
    ["a negative lesson id", { lessonId: -2 }],
    ["a fractional lesson id", { lessonId: 1.5 }],
    ["a string lesson id", { lessonId: "2" as never }],
    ["a negative block id", { blockId: -1 }],
    ["a fractional block id", { blockId: 0.5 }],
    ["a string block id", { blockId: "3" as never }],
    ["an unsafe block id", { blockId: Number.MAX_SAFE_INTEGER + 2 }],
    ["empty text", { text: "" }],
    ["text that isn't a string", { text: 5 as never }],
    ["text over 10,000 characters", { text: "x".repeat(10_001) }],
  ];

  it.each(badCreateFields)("createHighlight rejects %s", async (_n, over) => {
    const result = await createHighlight({ ...validCreate, ...over });
    expect(result).toEqual(invalid);
    expectNothingSent();
  });

  it("createHighlight accepts a block id of 0 and text of exactly 10,000 characters", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));

    const result = await createHighlight({
      ...validCreate,
      blockId: 0,
      text: "x".repeat(10_000),
    });

    expect(result.ok).toBe(true);
  });

  it.each([
    ["empty text", ""],
    ["text that isn't a string", 5],
    ["text over 10,000 characters", "x".repeat(10_001)],
  ])("updateHighlight rejects %s", async (_n, text) => {
    const result = await updateHighlight(5, {
      text: text as string,
    });
    expect(result).toEqual(invalid);
    expectNothingSent();
  });
});

describe("the position that is sent is rebuilt from the validated numbers", () => {
  const sneaky = { start: 1, end: 4, extra: "x" } as {
    start: number;
    end: number;
  };

  it("createHighlight drops extra keys on position", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));

    await createHighlight({ ...validCreate, position: sneaky });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.data.position).toEqual({ start: 1, end: 4 });
  });

  it("updateHighlight drops extra keys on position", async () => {
    mockedFetchAPI.mockResolvedValue([{ id: 5, authorized_user: { id: 7 } }]);
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));

    await updateHighlight(5, { position: sneaky });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.data.position).toEqual({ start: 1, end: 4 });
  });
});

describe("validation does not replace authentication", () => {
  it("still answers unauthenticated first for a logged-out caller", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.loggedOut());
    const result = await deleteHighlight(-1);
    expect(result).toEqual({
      ok: false,
      error: "unauthenticated",
      data: null,
    });
  });
});
