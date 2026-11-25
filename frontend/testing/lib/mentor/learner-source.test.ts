import {
  getLearnerContext,
  studentAllowsPersonalization,
} from "@/lib/mentor/learner-source";
import { getLearnerEnrollments } from "@/lib/requests/learner-enrollments";
import { getRecentQuizAttempts } from "@/lib/requests/quiz-attempts-recent";

jest.mock("@/lib/requests/learner-enrollments", () => ({
  getLearnerEnrollments: jest.fn(),
}));
jest.mock("@/lib/requests/quiz-attempts-recent", () => ({
  getRecentQuizAttempts: jest.fn(),
}));
const mockRows = jest.mocked(getLearnerEnrollments);
const mockAttempts = jest.mocked(getRecentQuizAttempts);
const miss = {
  quizType: "choice" as const,
  questionId: 1,
  correct: false,
  createdAt: new Date().toISOString(),
  lesson: { id: 1, name: "Loops" },
  droplet: { id: 5, status: "published", isHidden: false },
};

describe("learner source", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttempts.mockResolvedValue([]);
  });

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
    expect(mockAttempts).toHaveBeenCalledWith(7);
  });

  it("adds the recently missed lessons, and leaves them out when the attempts fetch fails", async () => {
    mockRows.mockResolvedValue([]);
    mockAttempts.mockResolvedValueOnce([miss]);
    await expect(
      getLearnerContext(7, { id: 5, prerequisites: [] }),
    ).resolves.toMatchObject({
      recentlyMissed: [{ lesson: "Loops", missed: 1 }],
    });

    mockAttempts.mockResolvedValueOnce([null as never]);
    const malformed = await getLearnerContext(7, { id: 5, prerequisites: [] });
    expect(malformed).not.toBeNull();
    expect(malformed).not.toHaveProperty("recentlyMissed");

    mockAttempts.mockResolvedValueOnce(null);
    const context = await getLearnerContext(7, { id: 5, prerequisites: [] });
    expect(context).not.toBeNull();
    expect(context).not.toHaveProperty("recentlyMissed");
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
