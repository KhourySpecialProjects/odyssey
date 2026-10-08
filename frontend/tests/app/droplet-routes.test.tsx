/**
 * Public droplet routes (layout, overview, lesson) 404 when the viewable-droplet
 * gate returns null, and the lesson page 404s for a lesson the droplet doesn't own.
 */
import DropletLayout, {
  generateMetadata as layoutMetadata,
} from "@/app/(droplets)/d/[slug]/layout";
import DropletRoute, {
  generateMetadata as pageMetadata,
} from "@/app/(droplets)/d/[slug]/page";
import LessonPage, {
  generateMetadata as lessonMetadata,
} from "@/app/(droplets)/d/[slug]/[lessonSlug]/page";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import {
  getCachedEnrollmentsWithLessonIds,
  getCachedLessonBySlug,
  getCachedUser,
  getCachedViewableDropletBySlug,
} from "@/lib/requests/cached";
import { DropletLayoutShell } from "@/components/droplets/droplet-layout-shell";
import { notFound } from "next/navigation";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/auth/current-user-id", () => ({
  getAuthorizedUserId: jest.fn(),
}));
jest.mock("@/lib/requests/cached", () => ({
  getCachedViewableDropletBySlug: jest.fn(),
  getCachedEnrollmentsWithLessonIds: jest.fn(),
  getCachedLessonBySlug: jest.fn(),
  getCachedUser: jest.fn(),
}));
jest.mock("@/lib/requests/notes", () => ({
  getNotesByAuthorizedUserAndLesson: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/requests/highlights", () => ({
  getHighlightsByAuthorizedUserAndLesson: jest.fn().mockResolvedValue([]),
}));
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/components/droplets/droplet-layout-shell", () => ({
  DropletLayoutShell: jest.fn(() => null),
}));
jest.mock("@/components/droplets/lessons/droplet-lesson-wrapper", () => ({
  DropletLessonWrapper: jest.fn(() => null),
}));
jest.mock("@/components/droplets/completion-backfill", () => ({
  CompletionBackfill: () => null,
}));
jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: () => null,
}));
jest.mock("@/components/droplets/enroll-button", () => ({
  EnrollButton: () => null,
}));
jest.mock("@/components/droplets/author-block", () => ({
  AuthorCard: () => null,
}));
jest.mock("@/components/ui/rating-stars", () => ({ StarRating: () => null }));
jest.mock("isomorphic-dompurify", () => ({
  __esModule: true,
  default: { sanitize: (s: string) => s },
}));

const mockedViewable = jest.mocked(getCachedViewableDropletBySlug);
const mockedLesson = jest.mocked(getCachedLessonBySlug);
const mockedUser = jest.mocked(getCurrentUser);
const mockedUserId = jest.mocked(getAuthorizedUserId);
const mockedEnrollments = jest.mocked(getCachedEnrollmentsWithLessonIds);
const mockedAuthUser = jest.mocked(getCachedUser);

const SESSION = { id: 7, email: "u@example.com", roles: [] } as never;
const DROPLET = {
  id: 5,
  name: "Python Basics",
  slug: "python-basics",
  focusArea: "technical",
  type: "skill",
  learningObjectives: [],
  lessons: [{ id: 10, name: "L1", slug: "l1", orderIndex: 0 }],
  authorized_users: [],
} as never;
const LESSON = { id: 10, name: "L1", slug: "l1" } as never;
const OTHER_LESSON = { id: 99, name: "Other", slug: "other" } as never;

const params = () =>
  Promise.resolve({ slug: "python-basics", lessonSlug: "l1" });

beforeEach(() => {
  jest.clearAllMocks();
  mockedUser.mockResolvedValue(SESSION);
  mockedUserId.mockResolvedValue(7);
  mockedEnrollments.mockResolvedValue([]);
  mockedAuthUser.mockResolvedValue({ id: 7 } as never);
});

describe("droplet layout", () => {
  it("404s when the viewable gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    await expect(
      DropletLayout({ params: params(), children: null }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockedViewable).toHaveBeenCalledWith("python-basics");
  });

  it("renders the shell for a viewable droplet", async () => {
    mockedViewable.mockResolvedValue(DROPLET);
    const el = await DropletLayout({ params: params(), children: null });
    expect(el.type).toBe(DropletLayoutShell);
    expect(notFound).not.toHaveBeenCalled();
  });

  it("returns empty metadata when the gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    expect(await layoutMetadata({ params: params(), children: null })).toEqual(
      {},
    );
  });
});

describe("droplet overview page", () => {
  it("404s when the viewable gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    await expect(DropletRoute({ params: params() })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("returns empty metadata when the gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    expect(await pageMetadata({ params: params() })).toEqual({});
  });

  it("titles the page for a viewable droplet", async () => {
    mockedViewable.mockResolvedValue(DROPLET);
    expect(await pageMetadata({ params: params() })).toEqual({
      title: "Overview | Python Basics",
    });
  });
});

describe("droplet lesson page", () => {
  const lessonParams = () => params();

  it("404s when the viewable gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    mockedLesson.mockResolvedValue(LESSON);
    await expect(LessonPage({ params: lessonParams() })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s for a lesson that isn't in the droplet's lessons", async () => {
    mockedViewable.mockResolvedValue(DROPLET);
    mockedLesson.mockResolvedValue(OTHER_LESSON);
    await expect(LessonPage({ params: lessonParams() })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("renders a lesson that belongs to the droplet", async () => {
    mockedViewable.mockResolvedValue(DROPLET);
    mockedLesson.mockResolvedValue(LESSON);
    const el = await LessonPage({ params: lessonParams() });
    expect(el).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("returns empty metadata when the gate returns null", async () => {
    mockedViewable.mockResolvedValue(null);
    mockedLesson.mockResolvedValue(LESSON);
    expect(await lessonMetadata({ params: lessonParams() })).toEqual({});
  });

  it("returns empty metadata for a lesson the droplet doesn't own", async () => {
    mockedViewable.mockResolvedValue(DROPLET);
    mockedLesson.mockResolvedValue(OTHER_LESSON);
    expect(await lessonMetadata({ params: lessonParams() })).toEqual({});
  });

  it("titles the page with the lesson name when it belongs", async () => {
    mockedViewable.mockResolvedValue(DROPLET);
    mockedLesson.mockResolvedValue(LESSON);
    expect(await lessonMetadata({ params: lessonParams() })).toEqual({
      title: "L1",
    });
  });
});
