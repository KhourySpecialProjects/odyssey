import { revalidatePath } from "next/cache";
import { saveAiScoringPrompt } from "@/lib/requests/ai-scoring-prompt";
import { requireRole } from "@/lib/auth/require-role";
import { DEFAULT_PROMPT } from "@/lib/ai-review/system-prompt";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));

const mockedRequireRole = jest.mocked(requireRole);
let fetchMock: jest.MockedFunction<typeof fetch>;

const parts = { instructions: "I", lessonScope: "L", overallScope: "O" };

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  fetchMock.mockResolvedValue(makeFetchResponse({ data: parts }));
  mockedRequireRole.mockResolvedValue(authFixtures.admin());
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describeServerActionAuth("saveAiScoringPrompt", {
  requireRole: mockedRequireRole,
  invoke: () => saveAiScoringPrompt(parts),
  mutations: () => [fetchMock, jest.mocked(revalidatePath)],
  denial: { kind: "role", roles: [AuthorizedUserRoleTitle.SysAdmin] },
  authorized: {
    as: authFixtures.admin(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("saveAiScoringPrompt", () => {
  it("posts the trimmed parts as { data } with the v4 header and revalidates the page", async () => {
    const result = await saveAiScoringPrompt({
      ...parts,
      lessonScope: "  L  ",
    });

    expect(result).toEqual({
      ok: true,
      error: null,
      data: {
        custom: { instructions: true, lessonScope: true, overallScope: true },
      },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/ai-scoring-setting\/prompt$/);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "Strapi-Response-Format": "v4" });
    expect(JSON.parse(String(init?.body))).toEqual({ data: parts });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/scorecard-prompts");
  });

  it("sends a part equal to the default as null (Reset)", async () => {
    const result = await saveAiScoringPrompt({
      ...parts,
      overallScope: DEFAULT_PROMPT.overallScope,
    });

    expect(
      JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).data.overallScope,
    ).toBeNull();
    expect(result.ok && result.data.custom.overallScope).toBe(false);
  });

  it("refuses a blank part without calling Strapi", async () => {
    const result = await saveAiScoringPrompt({ ...parts, instructions: " " });

    expect(result).toEqual({ ok: false, error: "invalid_input", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, "invalid_input"],
    [500, "failed"],
  ])("maps a Strapi %i to %s without revalidating", async (status, error) => {
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "nope" } }, status),
    );

    const result = await saveAiScoringPrompt(parts);

    expect(result).toMatchObject({ ok: false, error, data: null });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
