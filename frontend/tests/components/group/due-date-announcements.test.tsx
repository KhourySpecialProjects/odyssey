import { render, screen, fireEvent } from "@testing-library/react";
import DueDateAnnouncements from "@/components/group/due-date-announcements";
import { DateTime } from "luxon";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  GroupSemester,
  Tag,
} from "@/types";

describe("DueDateAnnouncements", () => {
  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "SPRING" as GroupSemester,
  };
  const tomorrow = DateTime.local().plus({ days: 1 }).toISO();
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
  };
  const mockDueDates = [
    {
      id: 1,
      droplet: mockDroplet,
      dueDate: tomorrow,
      authorized_user: 1,
      group: mockGroup,
    },
    {
      id: 1,
      droplet: mockDroplet,
      dueDate: tomorrow,
      authorized_user: 1,
      group: mockGroup,
    },
    {
      id: 1,
      droplet: mockDroplet,
      dueDate: tomorrow,
      authorized_user: 1,
      group: mockGroup,
    },
    {
      id: 1,
      droplet: mockDroplet,
      dueDate: tomorrow,
      authorized_user: 1,
      group: mockGroup,
    },
    {
      id: 1,
      droplet: mockDroplet,
      dueDate: tomorrow,
      authorized_user: 1,
      group: mockGroup,
    },
    {
      id: 1,
      droplet: mockDroplet,
      dueDate: tomorrow,
      authorized_user: 1,
      group: mockGroup,
    },
  ];

  it("renders upcoming due dates", () => {
    render(<DueDateAnnouncements dueDates={mockDueDates} />);
    expect(screen.getAllByText(/Test Droplet/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/is due in 1 day!/)[0]).toBeInTheDocument();
  });

  it("handles see more/less toggle", () => {
    const manyDueDates = Array(6).fill(mockDueDates[0]);
    render(<DueDateAnnouncements dueDates={manyDueDates} />);

    expect(screen.getByText("see more...")).toBeInTheDocument();
    fireEvent.click(screen.getByText("see more..."));
    expect(screen.getByText("see less...")).toBeInTheDocument();
  });

  test("handles see more/less toggle correctly", () => {
    render(<DueDateAnnouncements dueDates={mockDueDates} />);

    expect(screen.getAllByText(/Droplet/)).toHaveLength(5);

    const toggleButton = screen.getByText(/see more/i);
    fireEvent.click(toggleButton);

    expect(screen.getAllByText(/Droplet/)).toHaveLength(6);

    fireEvent.click(toggleButton);

    expect(screen.getAllByText(/Droplet/)).toHaveLength(5);
  });
});
