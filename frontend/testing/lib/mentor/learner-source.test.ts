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

  it("re-exports ODY-935's check, which fails closed on a lookup error", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("down"));
    await expect(studentAllowsPersonalization(7)).resolves.toBe(false);
    fetchSpy.mockRestore();
    error.mockRestore();
  });
});
