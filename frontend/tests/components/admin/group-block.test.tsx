import { render, screen } from "@testing-library/react";
import { GroupBlock } from "@/components/admin/groups/group-block";
import { GroupSemester } from "@/types";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock("@/lib/requests/groups", () => ({
  updateGroup: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("GroupBlock", () => {
  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "Spring 2025" as GroupSemester,
  };

  const mockGroup2 = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: true,
    semester: "Spring 2025" as GroupSemester,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows (Archived) text when group is archived", () => {
    const archivedGroup = { ...mockGroup, isArchived: true };
    render(<GroupBlock group={archivedGroup} />);
    expect(screen.getByText(/test group.*archived/i)).toBeInTheDocument();
  });

  it('shows "Archive Group" button when group is not archived', () => {
    render(<GroupBlock group={mockGroup} />);
    expect(
      screen.getByRole("button", { name: /archive group/i }),
    ).toBeInTheDocument();
  });

  it('shows "Unarchive Group" button when group is archived', () => {
    const archivedGroup = { ...mockGroup, isArchived: true };
    render(<GroupBlock group={archivedGroup} />);
    expect(
      screen.getByRole("button", { name: /unarchive group/i }),
    ).toBeInTheDocument();
  });

  it("shows correct button text based on group archive status", () => {
    const archivedGroup = { ...mockGroup, isArchived: true };
    const { rerender } = render(<GroupBlock group={mockGroup} />);

    expect(screen.getByText("Archive Group")).toBeInTheDocument();
  });
});
