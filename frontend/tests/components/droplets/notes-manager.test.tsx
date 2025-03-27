import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { NotesManager } from "@/components/droplets/notes-manager";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";
import { PDFDocument } from "pdf-lib";

jest.mock("pdf-lib", () => ({
  PDFDocument: {
    create: jest.fn().mockResolvedValue({
      save: jest.fn().mockResolvedValue(new Uint8Array()),
      copyPages: jest.fn().mockResolvedValue([{}]),
      addPage: jest.fn(),
    }),
    load: jest.fn().mockResolvedValue({
      getPages: jest.fn().mockReturnValue([{}]),
    }),
  },
}));

describe("NotesManager", () => {
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
    allNotes: [
      {
        dropletId: 1,
        notes: [],
        highlights: [],
      },
    ],
    initialPdfBytes: new Uint8Array(),
  };

  it("renders title and description", () => {
    render(<NotesManager {...mockProps} />);

    expect(screen.getByText("Saved Notes")).toBeInTheDocument();
    expect(
      screen.getByText(/collection of notes and highlights/),
    ).toBeInTheDocument();
  });

  it("shows generating PDF message when processing", async () => {
    render(<NotesManager {...mockProps} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(screen.getByText("Generating PDF...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Generating PDF...")).not.toBeInTheDocument();
    });
  });

  it("renders droplet notes summaries", () => {
    render(<NotesManager {...mockProps} />);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });

  const mockAllNotes = [
    {
      dropletId: 1,
      notes: [],
      highlights: [],
    },
  ];

  it("generates PDF when selection changes", async () => {
    const mockPdfDoc = {
      copyPages: jest.fn().mockResolvedValue([{}]),
      addPage: jest.fn(),
      save: jest.fn().mockResolvedValue(new Uint8Array()),
    };

    (PDFDocument.create as jest.Mock).mockResolvedValue(mockPdfDoc);
    (PDFDocument.load as jest.Mock).mockResolvedValue({
      getPages: jest.fn().mockReturnValue([{}]),
    });

    render(
      <NotesManager
        enrollments={mockProps.enrollments}
        allNotes={mockAllNotes}
        initialPdfBytes={new Uint8Array()}
      />,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(PDFDocument.create).toHaveBeenCalled();
    expect(mockPdfDoc.save).toHaveBeenCalled();
  });

  it("shows loading state while generating PDF", async () => {
    (PDFDocument.create as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(
      <NotesManager
        enrollments={mockProps.enrollments}
        allNotes={mockAllNotes}
        initialPdfBytes={new Uint8Array()}
      />,
    );

    expect(screen.getByText("Generating PDF...")).toBeInTheDocument();
  });
});
