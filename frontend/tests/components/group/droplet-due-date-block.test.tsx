import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DropletDueDateBlock } from "@/components/group/droplet-due-date-block";
import { assignDropletDueDate, getGroupDueDate } from "@/lib/requests/groups";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  GroupSemester,
  Tag,
} from "@/types";

jest.mock("@/lib/requests/groups", () => ({
  assignDropletDueDate: jest.fn().mockResolvedValue({ success: true }),
  getGroupDueDate: jest.fn(),
}));

describe("DropletDueDateBlock", () => {
  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "SPRING" as GroupSemester,
  };
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: [],
  };

  beforeEach(() => {
    (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: null });
    jest.clearAllMocks();
  });

  it("renders droplet name", () => {
    render(
      <DropletDueDateBlock
        existingGroup={mockGroup}
        currentDroplet={mockDroplet}
      />,
    );
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getGroupDueDate as jest.Mock).mockResolvedValue({
      dueDate: "2024-03-20T15:00:00.000Z",
    });
  });

  test("fetches and sets due date on mount", async () => {
    render(
      <DropletDueDateBlock
        existingGroup={mockGroup}
        currentDroplet={mockDroplet}
      />,
    );

    await waitFor(() => {
      expect(getGroupDueDate).toHaveBeenCalledWith(mockDroplet, mockGroup);
    });
  });

  test("handles save date functionality", async () => {
    render(
      <DropletDueDateBlock
        existingGroup={mockGroup}
        currentDroplet={mockDroplet}
      />,
    );

    await waitFor(() => {
      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);
      expect(assignDropletDueDate).toHaveBeenCalled();
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });
  });
});
