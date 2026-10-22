/**
 * Draft droplet editor routes: layout, overview page and lesson page share one
 * request-deduplicated droplet query and only hand Client Components the data
 * they read.
 */
import { render } from "@testing-library/react";
import DraftLayout from "@/app/(editing)/draft/d/[slug]/layout";
import DraftOverviewPage from "@/app/(editing)/draft/d/[slug]/page";
import DraftLessonPage from "@/app/(editing)/draft/d/[slug]/[lessonSlug]/page";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedDraftDropletBySlug,
  getCachedDraftDropletOptions,
  getCachedUser,
} from "@/lib/requests/cached";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { getTags } from "@/lib/requests/tag";
import { DraftLayoutShell } from "@/components/draft/draft-layout-shell";
import { GeneralInfo } from "@/components/draft/metadata/general-info";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  SLIDE_BREAK_MARKER,
  SLIDE_BREAK_TYPE,
} from "@/lib/blocknote/slide-break";
import type { AuthorizedUser, Droplet, User } from "@/types";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
  getCachedDraftDropletBySlug: jest.fn(),
  getCachedDraftDropletOptions: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  updateDropletFunFact: jest.fn(),
}));

jest.mock("@/lib/requests/lesson", () => ({
  getLessonBySlug: jest.fn(),
}));

jest.mock("@/lib/requests/tag", () => ({
  getTags: jest.fn(),
}));

jest.mock("@/lib/requests/dataset", () => ({
  getDatasetsByDropletId: jest.fn(),
}));

jest.mock("@/lib/import/rate-limiter", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true })),
  formatRateLimitError: jest.fn(),
}));

jest.mock("@anthropic-ai/sdk", () => jest.fn());

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => "NOT_FOUND"),
}));

jest.mock("@/components/draft/draft-layout-shell", () => ({
  DraftLayoutShell: jest.fn(() => null),
}));
jest.mock("@/components/draft/lesson/lesson-renderer", () => ({
  LessonRenderer: jest.fn(() => null),
}));
jest.mock("@/components/draft/metadata/general-info", () => ({
  GeneralInfo: jest.fn(() => null),
}));
jest.mock("@/components/draft/metadata/droplet-name", () => ({
  DropletName: () => null,
}));
jest.mock(
  "@/components/draft/metadata/learning-objectives/learning-objectives",
  () => ({ LearningObjectives: () => null }),
);
jest.mock("@/components/draft/metadata/next-steps/next-steps", () => ({
  NextSteps: () => null,
}));
jest.mock("@/components/draft/metadata/overview", () => ({
  Overview: () => null,
}));
jest.mock("@/components/draft/metadata/description", () => ({
  Description: () => null,
}));
jest.mock("@/components/draft/metadata/authors", () => ({
  Authors: () => null,
}));
jest.mock("@/components/draft/metadata/fun-fact-editor", () => ({
  FunFactEditor: () => null,
}));
jest.mock("@/components/draft/metadata/datasets/datasets", () => ({
  Datasets: () => null,
}));
jest.mock("@/components/draft/metadata/clickable-badges", () => ({
  ClickableBadges: () => null,
}));

const mockedGetCurrentUser = jest.mocked(getCurrentUser);
const mockedGetCachedUser = jest.mocked(getCachedUser);
const mockedGetDraftDroplet = jest.mocked(getCachedDraftDropletBySlug);
const mockedGetDropletOptions = jest.mocked(getCachedDraftDropletOptions);
const mockedGetLessonBySlug = jest.mocked(getLessonBySlug);
const mockedGetTags = jest.mocked(getTags);
const mockedShell = jest.mocked(DraftLayoutShell);
const mockedGeneralInfo = jest.mocked(GeneralInfo);
const mockedLessonRenderer = jest.mocked(LessonRenderer);

const SESSION_USER = {
  id: 7,
  email: "author@example.com",
  roles: [AuthorizedUserRoleTitle.ContentCreator],
  isActive: true,
} as User;

const DATASETS = [
  {
    id: 1,
    name: "iris.csv",
    format: "csv",
    fileUrl: "https://cdn/iris.csv",
    fileSize: 10,
  },
];

const DRAFT_DROPLET = {
  id: 5,
  name: "Python Basics",
  slug: "python-basics",
  type: "skill",
  focusArea: "technical",
  difficulty: "beginner",
  description: "desc",
  overview: "<p>A long overview</p>",
  isHidden: false,
  status: "draft",
  inReview: false,
  afterReview: null,
  funFact: "fact",
  originalDropletId: 3,
  presentationEnabled: true,
  authorized_users: [{ id: 7 }],
  learningObjectives: [{ id: 1, objective: "Learn" }],
  tags: [{ id: 2, name: "python", slug: "python" }],
  prerequisites: [{ id: 8, name: "Intro", slug: "intro" }],
  postrequisites: [],
  nextSteps: [],
  datasets: DATASETS,
  lessons: [
    {
      id: 11,
      name: "V2 lesson",
      slug: "v2-lesson",
      type: "general",
      orderIndex: 0,
      blocksVersion: "v2",
      blocksV2: [
        { id: "a", type: "paragraph", content: [{ text: "big content" }] },
        { id: "b", type: SLIDE_BREAK_TYPE },
        { id: "c", type: "image", props: { url: "https://cdn/x.png" } },
      ],
      blocks: [],
    },
    {
      id: 12,
      name: "V1 lesson",
      slug: "v1-lesson",
      type: "general",
      orderIndex: 1,
      blocksVersion: "v1",
      blocksV2: null,
      blocks: [
        { id: 1, __component: "droplets.generic", content: SLIDE_BREAK_MARKER },
      ],
    },
  ],
} as unknown as Droplet;

const OPTIONS = [
  {
    id: 20,
    name: "Visible",
    slug: "visible",
    isHidden: false,
    lessons: [{ id: 1, name: "L1", orderIndex: 0 }],
  },
  {
    id: 21,
    name: "Hidden",
    slug: "hidden",
    isHidden: true,
    lessons: [{ id: 2, name: "L2", orderIndex: 0 }],
  },
] as unknown as Droplet[];

const params = (value: Record<string, string>) =>
  Promise.resolve(value) as Promise<never>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCurrentUser.mockResolvedValue(SESSION_USER);
  mockedGetCachedUser.mockResolvedValue({ id: 7 } as AuthorizedUser);
  mockedGetDraftDroplet.mockResolvedValue(DRAFT_DROPLET);
  mockedGetDropletOptions.mockResolvedValue(OPTIONS);
  mockedGetTags.mockResolvedValue([]);
});

describe("draft droplet layout", () => {
  async function renderLayout() {
    const element = await DraftLayout({
      params: params({ slug: "python-basics" }),
      children: <div />,
    });
    render(element as React.ReactElement);
    return mockedShell.mock.calls[0][0];
  }

  it("uses the shared draft droplet and droplet-options queries", async () => {
    const props = await renderLayout();

    expect(mockedGetDraftDroplet).toHaveBeenCalledWith("python-basics");
    expect(mockedGetDropletOptions).toHaveBeenCalled();
    expect(props.availableDroplets).toBe(OPTIONS);
  });

  it("passes the client shell only the droplet fields the sidebar reads", async () => {
    const { droplet } = await renderLayout();

    expect(Object.keys(droplet).sort()).toEqual(
      [
        "afterReview",
        "difficulty",
        "focusArea",
        "id",
        "inReview",
        "isHidden",
        "learningObjectives",
        "lessons",
        "name",
        "originalDropletId",
        "presentationEnabled",
        "slug",
        "status",
        "type",
      ].sort(),
    );
  });

  it("strips lesson content down to slide-break markers", async () => {
    const { droplet } = await renderLayout();
    const [v2Lesson, v1Lesson] = droplet.lessons!;

    expect(v2Lesson.blocksV2).toEqual([{ id: "b", type: SLIDE_BREAK_TYPE }]);
    expect(v2Lesson).toMatchObject({
      id: 11,
      name: "V2 lesson",
      slug: "v2-lesson",
      orderIndex: 0,
      blocksVersion: "v2",
    });
    expect(v1Lesson.blocksV2).toBeNull();
    expect(v1Lesson.blocks).toEqual([
      { id: 1, __component: "droplets.generic", content: SLIDE_BREAK_MARKER },
    ]);
  });

  it("returns notFound for users who are not authors, editors or admins", async () => {
    mockedGetCachedUser.mockResolvedValue({ id: 99 } as AuthorizedUser);

    const element = await DraftLayout({
      params: params({ slug: "python-basics" }),
      children: <div />,
    });

    expect(element).toBe("NOT_FOUND");
    expect(mockedShell).not.toHaveBeenCalled();
  });
});

describe("draft droplet overview page", () => {
  it("offers only visible published droplets as prerequisite choices", async () => {
    const element = await DraftOverviewPage({
      params: params({ slug: "python-basics" }),
    });
    render(element as React.ReactElement);

    expect(mockedGetDraftDroplet).toHaveBeenCalledWith("python-basics");
    expect(mockedGeneralInfo.mock.calls[0][0].droplets).toEqual([
      { id: 20, name: "Visible", slug: "visible" },
    ]);
  });
});

describe("draft lesson page", () => {
  it("uses the droplet query's datasets instead of a separate request", async () => {
    const { getDatasetsByDropletId } = jest.requireMock(
      "@/lib/requests/dataset",
    );
    mockedGetLessonBySlug.mockResolvedValue({ id: 11, name: "V2 lesson" });

    const element = await DraftLessonPage({
      params: params({ slug: "python-basics", lessonSlug: "v2-lesson" }),
    });
    render(element as React.ReactElement);

    expect(mockedGetDraftDroplet).toHaveBeenCalledWith("python-basics");
    expect(getDatasetsByDropletId).not.toHaveBeenCalled();
    expect(mockedLessonRenderer.mock.calls[0][0].datasets).toBe(DATASETS);
  });
});
