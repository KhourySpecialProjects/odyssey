import { render, screen, fireEvent } from "@testing-library/react";
import { NotesSummaryClient } from "@/components/droplets/notes-summary-client";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  HighlightColor,
  Tag,
} from "@/types";
import { DateTime } from "luxon";

describe("NotesSummaryClient", () => {
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
  const mockProps = {
    index: 0,
    dropletHighlights: [
      {
        id: 1,
        text: "Test highlight",
        color: "#fff300" as HighlightColor,
        position: { start: 0, end: 0 },
        blockId: 1,
      },
    ],
    dropletNotes: [],
    enrollment: {
      id: "1",
      authorizedUser: { id: 1 },
      droplet: mockDroplet,
      viewedLessons: [],
      isComplete: false,
      rating: 5,
      notes: [],
      isFirstTime: false,
      isArchived: false,
      completionDate: DateTime.local().toJSDate()
    },
    allNotes: [
      {
        dropletId: 1,
        notes: [],
        highlights: [],
      },
    ],
    onSelectionChange: jest.fn(),
    selectedDropletIds: new Set<number>(),
  };

  it("renders droplet name", () => {
    render(<NotesSummaryClient {...mockProps} />);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });

  it("handles droplet selection", () => {
    render(<NotesSummaryClient {...mockProps} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(mockProps.onSelectionChange).toHaveBeenCalledWith(1, true);
  });

  it("toggles content visibility when clicked", () => {
    render(<NotesSummaryClient {...mockProps} />);

    const toggleButton = screen.getByRole("button");
    fireEvent.click(toggleButton);
  });
});
