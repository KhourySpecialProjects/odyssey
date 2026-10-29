import { act, render, renderHook, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/draft/sidebar";
import {
  ReviewCommentsProvider,
  SentFeedbackProvider,
  useDropletReviewComments,
} from "@/components/draft/review/review-comments-context";
import { getMyReview, getReviewForDroplet } from "@/lib/requests/reviews";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));
jest.mock("next-auth/react", () => ({ signOut: jest.fn() }));
jest.mock("@/lib/requests/feed", () => ({
  createDropletAnnouncement: jest.fn(),
}));
jest.mock("@/components/draft/add-lesson", () => ({
  AddLesson: () => <div data-testid="add-lesson" />,
}));
jest.mock("@/components/draft/review/score-with-ai-button", () => ({
  ScoreWithAiButton: () => <div data-testid="score-with-ai" />,
}));
jest.mock("@/components/draft/metadata/content-action-button", () => ({
  ContentActionButton: () => <div data-testid="content-action-button" />,
}));
jest.mock("@/lib/requests/reviews", () => ({
  getMyReview: jest.fn(),
  getReviewForDroplet: jest.fn(),
  markAddressed: jest.fn(),
  getOrOpenReview: jest.fn(),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
}));

const editor = {
  name: "Eli Editor",
  email: "eli@example.test",
  roles: [AuthorizedUserRoleTitle.ContentEditor],
  isActive: true,
};

const lesson = (id: number, name: string) => ({
  id,
  name,
  slug: `lesson-${id}`,
  orderIndex: id,
  droplets: [],
  blocks: [],
});

const droplet = {
  id: 3,
  name: "Loops",
  slug: "loops",
  status: "draft",
  type: "knowledge",
  focusArea: "technical",
  isHidden: false,
  presentationEnabled: false,
  learningObjectives: [],
  inReview: true,
  afterReview: undefined,
  lessons: [lesson(1, "First lesson"), lesson(2, "Second lesson")],
};

const anchor = { v: 1, field: "blocks", blockId: "b1" };
const review = {
  id: 7,
  round: 1,
  key: "3:9:1",
  state: "open",
  comments: [
    { id: 1, field: "blocks", anchor, body: "a", lesson: { id: 1 } },
    { id: 2, field: "blocks", anchor, body: "b", lesson: { id: 1 } },
    {
      id: 3,
      field: "blocks",
      anchor,
      body: "c",
      lesson: { id: 1 },
      resolvedAt: "2026-10-27T12:00:00Z",
    },
    {
      id: 4,
      field: "overview",
      anchor: { v: 1, field: "overview", quote: "q", prefix: "", suffix: "" },
      body: "d",
      lesson: null,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  (usePathname as jest.Mock).mockReturnValue("/draft/d/loops");
  jest
    .mocked(getMyReview)
    .mockResolvedValue({ ok: true, error: null, data: review } as never);
});

async function renderSidebar(enabled = true) {
  render(
    <ReviewCommentsProvider dropletId={3} enabled={enabled}>
      <Sidebar
        user={editor as never}
        droplet={droplet as never}
        availableDroplets={[]}
        isAuthor={false}
        expanded
        setExpanded={jest.fn()}
        onRestartTour={jest.fn()}
      />
    </ReviewCommentsProvider>,
  );
  await act(async () => {});
}

describe("open-comment counts in the sidebar (Task 9)", () => {
  it("shows each lesson's open comments, leaving resolved ones out", async () => {
    await renderSidebar();

    expect(screen.getByLabelText("2 open comments")).toHaveTextContent("2");
    // The second lesson has none, so no badge
    expect(screen.getAllByLabelText(/open comments?$/)).toHaveLength(2);
  });

  it("shows the Overview's open comments", async () => {
    await renderSidebar();

    expect(screen.getByLabelText("1 open comment")).toHaveTextContent("1");
  });

  it("shows nothing for someone who isn't reviewing", async () => {
    await renderSidebar(false);

    expect(getMyReview).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/open comments?$/)).toBeNull();
  });
});

describe("useDropletReviewComments", () => {
  it("uses the layout's comments, loading them once", async () => {
    const { result } = renderHook(() => useDropletReviewComments(3, true), {
      wrapper: ({ children }) => (
        <ReviewCommentsProvider dropletId={3} enabled>
          {children}
        </ReviewCommentsProvider>
      ),
    });
    await act(async () => {});

    expect(result.current.comments).toHaveLength(4);
    expect(getMyReview).toHaveBeenCalledTimes(1);
  });

  it("loads its own when the layout isn't loading any", async () => {
    const { result } = renderHook(() => useDropletReviewComments(3, true), {
      wrapper: ({ children }) => (
        <ReviewCommentsProvider dropletId={3} enabled={false}>
          {children}
        </ReviewCommentsProvider>
      ),
    });
    await act(async () => {});

    expect(result.current.comments).toHaveLength(4);
    expect(getMyReview).toHaveBeenCalledTimes(1);
  });

  it("loads its own with no layout at all", async () => {
    const { result } = renderHook(() => useDropletReviewComments(3, true));
    await act(async () => {});

    expect(result.current.comments).toHaveLength(4);
  });
});

describe("an author's counts of the feedback sent to them (ODY-807)", () => {
  const faculty = {
    ...editor,
    roles: [AuthorizedUserRoleTitle.Faculty],
  };

  async function renderAuthorSidebar() {
    render(
      <ReviewCommentsProvider dropletId={3} enabled={false}>
        <SentFeedbackProvider dropletId={3} enabled>
          <Sidebar
            user={faculty as never}
            droplet={{ ...droplet, inReview: false } as never}
            availableDroplets={[]}
            isAuthor
            expanded
            setExpanded={jest.fn()}
            onRestartTour={jest.fn()}
          />
        </SentFeedbackProvider>
      </ReviewCommentsProvider>,
    );
    await act(async () => {});
  }

  it("counts each lesson's open sent comments and the Overview's", async () => {
    jest.mocked(getReviewForDroplet).mockResolvedValue({
      ok: true,
      error: null,
      data: { ...review, state: "sent" },
    } as never);

    await renderAuthorSidebar();

    expect(getMyReview).not.toHaveBeenCalled();
    expect(screen.getByLabelText("2 open comments")).toHaveTextContent("2");
    expect(screen.getByLabelText("1 open comment")).toHaveTextContent("1");
  });

  it("counts nothing before any feedback is sent", async () => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue({ ok: true, error: null, data: null } as never);

    await renderAuthorSidebar();

    expect(screen.queryByLabelText(/open comments?$/)).toBeNull();
  });
});
