import { CACHE_TAGS } from "@/lib/cache-tags";
import { getLearnerEnrollments } from "@/lib/requests/learner-enrollments";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));
const mockFetch = jest.mocked(fetchAPI);

describe("getLearnerEnrollments", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends exactly these params and tags, with numeric ids and no cache option", async () => {
    mockFetch.mockResolvedValue([{ isComplete: true }]);
    await expect(getLearnerEnrollments(7)).resolves.toEqual([
      { isComplete: true },
    ]);
    expect(mockFetch).toHaveBeenCalledWith("/enrollments", {
      urlParams: {
        filters: {
          authorizedUser: { id: { $eq: 7 } },
          droplet: { id: { $notNull: true } },
        },
        fields: [
          "isComplete",
          "isArchived",
          "completionDate",
          "lastProgressDate",
          "updatedAt",
        ],
        populate: {
          droplet: {
            fields: ["name", "difficulty", "status", "isHidden"],
            populate: {
              tags: { fields: ["name"] },
              lessons: { fields: ["id"] },
            },
          },
          viewedLessons: { fields: ["name"] },
        },
        sort: ["updatedAt:desc"],
        pagination: { pageSize: 250, page: 1 },
      },
      next: {
        tags: [
          CACHE_TAGS.enrollments(7),
          CACHE_TAGS.allEnrollments,
          CACHE_TAGS.droplets,
        ],
        revalidate: 900,
      },
    });
    expect(mockFetch.mock.calls[0][1]).not.toHaveProperty("cache");
  });

  it("never asks for rating, notes, due dates, authorized users or groups", async () => {
    mockFetch.mockResolvedValue(null);
    await expect(getLearnerEnrollments(7)).resolves.toEqual([]);
    const query = JSON.stringify(mockFetch.mock.calls[0][1].urlParams);
    expect(query).not.toMatch(/rating|notes|dueDate|groups|voyage/i);
    expect(query.match(/authorizedUser/g)).toHaveLength(1);
  });
});
