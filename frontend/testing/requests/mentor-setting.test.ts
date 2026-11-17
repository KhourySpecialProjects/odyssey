import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getMentorSetting,
  mentorVisibleFor,
} from "@/lib/requests/mentor-setting";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));

const mockedFetchAPI = jest.mocked(fetchAPI);

const setting = (enabled: boolean, pilot: number[]) => ({
  enabled,
  pilotGroups: pilot.map((id) => ({ id })),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("getMentorSetting", () => {
  it("reads the single type with its pilot group ids, cached 60s", async () => {
    mockedFetchAPI.mockResolvedValueOnce(setting(true, [3, 4]));

    await expect(getMentorSetting()).resolves.toEqual({
      enabled: true,
      pilotGroupIds: [3, 4],
    });
    expect(mockedFetchAPI).toHaveBeenCalledWith("/mentor-setting", {
      urlParams: {
        fields: ["enabled"],
        populate: { pilotGroups: { fields: ["id"] } },
      },
      next: { tags: [CACHE_TAGS.mentorSetting], revalidate: 60 },
    });
  });

  it.each([null, undefined, {}])("is closed for %p", async (value) => {
    mockedFetchAPI.mockResolvedValueOnce(value);
    await expect(getMentorSetting()).resolves.toEqual({
      enabled: false,
      pilotGroupIds: [],
    });
  });

  it("is closed when the read fails", async () => {
    mockedFetchAPI.mockRejectedValueOnce(new Error("down"));
    await expect(getMentorSetting()).resolves.toEqual({
      enabled: false,
      pilotGroupIds: [],
    });
  });
});

describe("mentorVisibleFor", () => {
  const pilot = { enabled: true, pilotGroupIds: [3, 4] };

  it.each([
    [
      "enabled with no pilot groups",
      { enabled: true, pilotGroupIds: [] },
      true,
    ],
    ["disabled", { enabled: false, pilotGroupIds: [3] }, false],
  ])("is decided without a query when %s", async (_label, value, expected) => {
    await expect(mentorVisibleFor(value, 9)).resolves.toBe(expected);
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("shows to a member of a pilot group, filtering by numeric ids", async () => {
    mockedFetchAPI.mockResolvedValueOnce([{ id: 4 }]);

    await expect(mentorVisibleFor(pilot, 9)).resolves.toBe(true);
    expect(mockedFetchAPI).toHaveBeenCalledWith("/groups", {
      urlParams: {
        filters: { id: { $in: [3, 4] }, members: { id: { $eq: 9 } } },
        fields: ["id"],
        pagination: { pageSize: 1 },
      },
      next: {
        tags: [CACHE_TAGS.allGroups, CACHE_TAGS.userGroups(9)],
        revalidate: 60,
      },
    });
  });

  it("hides from a user in none of the pilot groups", async () => {
    mockedFetchAPI.mockResolvedValueOnce([]);
    await expect(mentorVisibleFor(pilot, 9)).resolves.toBe(false);
  });

  it("hides when the membership read fails", async () => {
    mockedFetchAPI.mockRejectedValueOnce(new Error("down"));
    await expect(mentorVisibleFor(pilot, 9)).resolves.toBe(false);
  });
});
