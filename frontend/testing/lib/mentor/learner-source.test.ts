import {
  getLearnerContext,
  studentAllowsPersonalization,
} from "@/lib/mentor/learner-source";
import { getLearnerEnrollments } from "@/lib/requests/learner-enrollments";

jest.mock("@/lib/requests/learner-enrollments", () => ({
  getLearnerEnrollments: jest.fn(),
}));
const mockRows = jest.mocked(getLearnerEnrollments);

describe("learner source", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps the student's rows for the current droplet", async () => {
    mockRows.mockResolvedValue([]);
    await expect(
      getLearnerContext(7, { id: 5, prerequisites: [] }),
    ).resolves.toEqual({
      finished: [],
      inProgress: [],
      prerequisites: [],
      viewedLessons: [],
    });
    expect(mockRows).toHaveBeenCalledWith(7);
  });

  it("is null when the fetch fails, so the caller sends the plain request", async () => {
    mockRows.mockRejectedValue(new Error("down"));
    await expect(
      getLearnerContext(7, { id: 5, prerequisites: [] }),
    ).resolves.toBeNull();
  });

  it("keeps the student's consent seam closed until ODY-935", async () => {
    await expect(studentAllowsPersonalization(7)).resolves.toBe(false);
  });
});
