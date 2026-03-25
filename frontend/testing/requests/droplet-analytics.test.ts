import { getDropletAnalytics } from "../../lib/requests/droplet-analytics";

jest.mock("../../lib/requests/enrollment", () => ({
  fetchEnrollmentMetadata: jest.fn(),
}));

const { fetchEnrollmentMetadata } = require("../../lib/requests/enrollment");

// Helper to build a raw enrollment object with optional rating
function makeRawEnrollment(
  id: number,
  rating?: number | null,
  viewedLessonIds: number[] = [],
) {
  return {
    id,
    attributes: {
      rating: rating ?? null,
      viewedLessons: { data: viewedLessonIds.map((lid) => ({ id: lid })) },
    },
  };
}

// Standard pagination metadata
function makeMeta(total: number) {
  return { pagination: { page: 1, pageCount: 1, pageSize: 1, total } };
}

describe("getDropletAnalytics — averageRating", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns averageRating=-1 and lastMonthAverageRating=-1 when no ratings exist", async () => {
    // The first four calls are the count-only metadata calls
    fetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(2) }) // total
      .mockResolvedValueOnce({ data: [], meta: makeMeta(1) }) // completed
      .mockResolvedValueOnce({ data: [], meta: makeMeta(1) }) // lastMonth total
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) }) // lastMonth completed
      // paginated loop for lesson views + rating (totalEnrolled=2 so loop runs)
      .mockResolvedValueOnce({
        data: [makeRawEnrollment(1, null), makeRawEnrollment(2, null)],
        meta: makeMeta(2),
      })
      // paginated loop for lastMonth rating (lastMonthEnrolled=1 so loop runs)
      .mockResolvedValueOnce({
        data: [makeRawEnrollment(1, null)],
        meta: makeMeta(1),
      });

    const result = await getDropletAnalytics(10, []);

    expect(result.averageRating).toBe(-1);
    expect(result.lastMonthAverageRating).toBe(-1);
  });

  it("computes averageRating from valid ratings, ignoring null/0", async () => {
    // totalEnrolled=3, completedCount=1, lastMonthEnrolled=1, lastMonthCompleted=0
    fetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(3) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(1) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(1) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      // main loop: 3 enrollments — ratings 4, null, 2  → avg = (4+2)/2 = 3.0
      .mockResolvedValueOnce({
        data: [
          makeRawEnrollment(1, 4),
          makeRawEnrollment(2, null),
          makeRawEnrollment(3, 2),
        ],
        meta: makeMeta(3),
      })
      // lastMonth loop: 1 enrollment — rating 5 → avg = 5.0
      .mockResolvedValueOnce({
        data: [makeRawEnrollment(1, 5)],
        meta: makeMeta(1),
      });

    const result = await getDropletAnalytics(10, []);

    expect(result.averageRating).toBe(3);
    expect(result.lastMonthAverageRating).toBe(5);
  });

  it("rounds averageRating to 1 decimal place", async () => {
    fetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(3) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      // main loop: ratings 4, 3, 5 → avg = 4.0
      .mockResolvedValueOnce({
        data: [
          makeRawEnrollment(1, 4),
          makeRawEnrollment(2, 3),
          makeRawEnrollment(3, 5),
        ],
        meta: makeMeta(3),
      })
      // lastMonth loop: no enrollments
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) });

    const result = await getDropletAnalytics(10, []);

    // (4+3+5)/3 = 4.0
    expect(result.averageRating).toBe(4);
    expect(result.lastMonthAverageRating).toBe(-1);
  });

  it("skips zero-value ratings (treats 0 as no rating)", async () => {
    fetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(2) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      // ratings: 0 and 4 → only 4 counts → avg = 4.0
      .mockResolvedValueOnce({
        data: [makeRawEnrollment(1, 0), makeRawEnrollment(2, 4)],
        meta: makeMeta(2),
      })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) });

    const result = await getDropletAnalytics(10, []);

    expect(result.averageRating).toBe(4);
  });

  it("does not run the main paginated loop when totalEnrolled is 0", async () => {
    fetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) });

    const result = await getDropletAnalytics(10, []);

    expect(result.averageRating).toBe(-1);
    expect(result.lastMonthAverageRating).toBe(-1);
    // Only the 4 count calls should have been made (no paginated loops)
    expect(fetchEnrollmentMetadata).toHaveBeenCalledTimes(4);
  });
});
