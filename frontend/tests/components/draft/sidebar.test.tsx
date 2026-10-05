import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { Sidebar } from "@/components/draft/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { createDropletAnnouncement } from "@/lib/requests/feed";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { DropletStatus, DropletType, FocusArea } from "@/types";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  createDropletAnnouncement: jest.fn(),
}));

jest.mock("@/components/draft/add-lesson", () => ({
  AddLesson: () => <div data-testid="add-lesson" />,
}));

// Mock the ContentActionButton component to avoid complex setup.
// Surface the actionType and buttonText so permission tests can assert on
// which buttons the sidebar hands to a given user role.
jest.mock("@/components/draft/metadata/content-action-button", () => ({
  ContentActionButton: ({
    actionType,
    buttonText,
  }: {
    actionType: string;
    buttonText: string;
  }) => (
    <div
      data-testid="content-action-button"
      data-action-type={actionType}
      data-button-text={buttonText}
    />
  ),
}));

describe("Sidebar", () => {
  const mockUser = {
    name: "Test User",
    email: "test@test.com",
    roles: [AuthorizedUserRoleTitle.User],
    isActive: true,
  };

  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    droplets: [],
    notes: [],
    blocks: [
      {
        id: 1,
        __component: "droplets.generic",
        content: "Generic content",
      },
      {
        id: 2,
        __component: "droplets.expandable",
        title: "Expandable title",
        content: "Expandable content",
      },
      {
        id: 3,
        __component: "droplets.video",
        url: "https://example.com/video",
      },
      {
        id: 4,
        __component: "droplets.callout",
        content: "Callout content",
        type: "info",
        color: "bg-sky-50",
      },
      {
        id: 5,
        __component: "droplets.quiz",
        questions: [
          {
            id: 1,
            content: "Quiz question",
            answerOptions: [
              { id: 1, content: "Option 1", isCorrect: true },
              { id: 2, content: "Option 2", isCorrect: false },
            ],
          },
        ],
      },
      {
        id: 6,
        __component: "droplets.open-ended-quiz",
        questions: [
          {
            id: 1,
            content: "Open ended question",
            correctAnswer: "Correct answer",
          },
        ],
      },
    ],
  };

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    status: "draft" as DropletStatus,
    type: "knowledge" as DropletType,
    focusArea: "personal" as FocusArea,
    isHidden: false,
    presentationEnabled: false,
    learningObjectives: [],
    inReview: false,
    afterReview: undefined,
    lessons: [{ ...mockLesson, orderIndex: 0 }],
  };

  const mockPublishedDroplet = {
    ...mockDroplet,
    status: "published" as DropletStatus,
  };

  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/draft/d/test-droplet");
    (createDropletAnnouncement as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  const defaultProps = {
    expanded: true,
    setExpanded: jest.fn(),
    onRestartTour: jest.fn(),
  };

  it("renders droplet name and lessons", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );
    expect(screen.getByText("Test Lesson")).toBeInTheDocument();
  });

  it("toggles mobile menu", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );
    const menuButton = screen.getByRole("button", { name: /open sidebar/i });
    fireEvent.click(menuButton);
    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toBeInTheDocument();
  });

  it("navigates to /my-content when home button clicked on draft droplet", async () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    const homeButton = screen.getByTestId("home");
    fireEvent.click(homeButton);

    // For draft droplets, it should navigate directly without showing dialog
    expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
    expect(createDropletAnnouncement).not.toHaveBeenCalled();
  });

  it("shows announcement dialog when home button clicked on published droplet", async () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockPublishedDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    // Click the home button to trigger the dialog
    const homeButton = screen.getByTestId("home");
    fireEvent.click(homeButton);

    // Wait for the dialog to appear
    await waitFor(() => {
      expect(
        screen.getByText(
          /would you like to announce these changes to everyone enrolled in this droplet/i,
        ),
      ).toBeInTheDocument();
    });

    // Verify Share and Not Now buttons are present
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /not now/i }),
    ).toBeInTheDocument();
  });

  it("handles droplet announcement when Share is clicked", async () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockPublishedDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    // Click the home button to open dialog
    const homeButton = screen.getByTestId("home");
    fireEvent.click(homeButton);

    // Wait for dialog and click Share
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /share/i }),
      ).toBeInTheDocument();
    });

    const shareButton = screen.getByRole("button", { name: /share/i });
    await act(async () => {
      fireEvent.click(shareButton);
    });

    // Verify announcement was created and navigation happened
    await waitFor(() => {
      expect(createDropletAnnouncement).toHaveBeenCalledWith(
        mockPublishedDroplet.name,
        mockPublishedDroplet.id,
      );
      expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
    });
  });

  it("handles 'Not Now' in announcement dialog", async () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockPublishedDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    // Click the home button to open dialog
    const homeButton = screen.getByTestId("home");
    fireEvent.click(homeButton);

    // Wait for dialog and click Not Now
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /not now/i }),
      ).toBeInTheDocument();
    });

    const notNowButton = screen.getByRole("button", { name: /not now/i });
    fireEvent.click(notNowButton);

    // Verify only redirect happened, no announcement created
    await waitFor(() => {
      expect(createDropletAnnouncement).not.toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
    });
  });

  it("handles lesson reordering", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    const lists = screen.getAllByRole("list");
    expect(lists.length).toBeGreaterThan(0);
  });

  it("renders sidebar element", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toBeInTheDocument();
  });

  it("renders preview button", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    const previewButton = screen.getByText("Preview");
    expect(previewButton).toBeInTheDocument();
  });

  it("renders metadata section", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        availableDroplets={[]}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  describe("action button permissions", () => {
    const { SysAdmin, Faculty, ContentEditor, ContentCreator, User } =
      AuthorizedUserRoleTitle;

    const draftStates = {
      "new draft": mockDroplet,
      "new draft in review": { ...mockDroplet, inReview: true },
      "edit draft": { ...mockDroplet, originalDropletId: 42 },
      "edit draft in review": {
        ...mockDroplet,
        originalDropletId: 42,
        inReview: true,
      },
    };

    // [actionType, buttonText] for each action button, in render order
    const renderActions = (
      roles: AuthorizedUserRoleTitle[],
      droplet: object,
    ) => {
      render(
        <Sidebar
          user={{ ...mockUser, roles } as any}
          droplet={droplet as any}
          availableDroplets={[]}
          {...defaultProps}
        />,
      );
      return screen
        .queryAllByTestId("content-action-button")
        .map((btn) => [
          btn.getAttribute("data-action-type"),
          btn.getAttribute("data-button-text"),
        ]);
    };

    const publish = ["publish", "Publish"];
    const publishChanges = ["publishDraft", "Publish changes"];
    const requestChanges = ["requestChanges", "Request changes"];
    const submitForReview = ["requestReview", "Submit for review"];

    it.each<[AuthorizedUserRoleTitle, keyof typeof draftStates, string[][]]>([
      [SysAdmin, "new draft", [publish]],
      [SysAdmin, "new draft in review", [publish, requestChanges]],
      [SysAdmin, "edit draft", [publishChanges]],
      [SysAdmin, "edit draft in review", [publishChanges, requestChanges]],
      [Faculty, "new draft", [publish]],
      [Faculty, "new draft in review", [publish, requestChanges]],
      [Faculty, "edit draft", [publishChanges]],
      [Faculty, "edit draft in review", [publishChanges, requestChanges]],
      // Content Editors publish only once a draft has been submitted for review
      [ContentEditor, "new draft", []],
      [ContentEditor, "new draft in review", [publish, requestChanges]],
      [ContentEditor, "edit draft", []],
      [ContentEditor, "edit draft in review", [publishChanges, requestChanges]],
      [ContentCreator, "new draft", [submitForReview]],
      [ContentCreator, "new draft in review", []],
      [ContentCreator, "edit draft", [submitForReview]],
      [ContentCreator, "edit draft in review", []],
      [User, "new draft", []],
      [User, "new draft in review", []],
      [User, "edit draft", []],
      [User, "edit draft in review", []],
    ])("%s, %s: %j", (role, state, expectedActions) => {
      expect(renderActions([role], draftStates[state])).toEqual(
        expectedActions,
      );
    });

    it("offers Resubmit for review once changes were requested", () => {
      expect(
        renderActions([ContentCreator], {
          ...mockDroplet,
          afterReview: "Please fix the quiz answers",
        }),
      ).toEqual([["requestReview", "Resubmit for review"]]);
    });

    it("lets a Content Editor who is also a Content Creator submit their draft for review", () => {
      expect(
        renderActions([ContentEditor, ContentCreator], mockDroplet),
      ).toEqual([submitForReview]);
    });

    it("gives an Admin who is also a Content Creator Publish instead of Submit for review", () => {
      expect(renderActions([SysAdmin, ContentCreator], mockDroplet)).toEqual([
        publish,
      ]);
    });

    it("shows no action buttons on a published droplet", () => {
      expect(renderActions([SysAdmin], mockPublishedDroplet)).toEqual([]);
    });
  });
});
