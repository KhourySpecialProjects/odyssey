import { render, screen, fireEvent } from "@testing-library/react";
import { NotesPdfButton } from "@/components/droplets/notes-pdf-button";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";

describe("NotesPdfButton", () => {
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
  const mockProps = {
    pdfBytes: new Uint8Array([1, 2, 3]),
    name: "test-notes",
    enrollments: [
      {
        id: "1",
        authorizedUser: { id: 1 },
        droplet: mockDroplet,
        viewedLessons: [],
        isComplete: false,
        rating: 5,
        notes: [],
        isFirstTime: false,
        isArchived: false,
      },
    ],
  };

  beforeEach(() => {
    URL.createObjectURL = jest.fn().mockReturnValue("blob:test") as jest.Mock;
    URL.revokeObjectURL = jest.fn();
  });

  it("renders button with correct text", () => {
    render(<NotesPdfButton {...mockProps} />);
    expect(screen.getByText("Download Notes as PDF")).toBeInTheDocument();
  });

  it("is disabled when no enrollments are provided", () => {
    render(<NotesPdfButton {...mockProps} enrollments={[]} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("handles download click correctly", () => {
    const mockUrl = "blob:test";

    const { container } = render(<NotesPdfButton {...mockProps} />);
    fireEvent.click(screen.getByRole("button"));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
  });
});
