import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { NotesManager } from "@/components/droplets/notes-manager";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  HighlightColor,
  Tag,
} from "@/types";
import { PDFDocument } from "pdf-lib";

jest.mock("pdf-lib", () => ({
  PDFDocument: {
    create: jest.fn(),
    load: jest.fn(),
  },
}));

// Mock child components
jest.mock("@/components/droplets/notes-summary-client", () => ({
  NotesSummaryClient: ({
    enrollment,
    onSelectionChange,
    selectedDropletIds,
  }: any) => (
    <div data-testid={`notes-summary-${enrollment.droplet.id}`}>
      <input
        type="checkbox"
        checked={selectedDropletIds.has(enrollment.droplet.id)}
        onChange={(e) =>
          onSelectionChange(enrollment.droplet.id, e.target.checked)
        }
        aria-label={`Select ${enrollment.droplet.name}`}
      />
      <div>{enrollment.droplet.name}</div>
    </div>
  ),
}));

jest.mock("@/components/droplets/notes-pdf-button", () => ({
  NotesPdfButton: ({ pdfBytes, name, noNotes }: any) => (
    <button data-testid="pdf-button" disabled={noNotes}>
      Download PDF
    </button>
  ),
}));

jest.mock("@/components/droplets/lessons/note-taking/note-summary", () => ({
  NoteSummary: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
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
  };

  const mockEnrollment = {
    id: "1",
    authorizedUser: { id: 1 } as any,
    droplet: mockDroplet,
    viewedLessons: [],
    isComplete: false,
    rating: 5,
    notes: [],
    isFirstTime: false,
    isArchived: false,
    completionDate: new Date(),
  };

  const mockPdfDoc = {
    copyPages: jest.fn().mockResolvedValue([{}]),
    addPage: jest.fn(),
    save: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
  };

  const mockLoadedPdf = {
    getPages: jest.fn().mockReturnValue([{}, {}]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (PDFDocument.create as jest.Mock).mockResolvedValue(mockPdfDoc);
    (PDFDocument.load as jest.Mock).mockResolvedValue(mockLoadedPdf);
    mockPdfDoc.save.mockResolvedValue(new Uint8Array([4, 5, 6]));
  });

  describe("Initial Rendering", () => {
    it("renders title and description", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [], highlights: [{ id: 1 } as any] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Saved Notes")).toBeInTheDocument();
      expect(
        screen.getByText(/collection of notes and highlights/),
      ).toBeInTheDocument();
    });

    it("renders Select All button", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [], highlights: [{ id: 1 } as any] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Select All")).toBeInTheDocument();
    });

    it("renders Deselect All button", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [], highlights: [{ id: 1 } as any] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Deselect All")).toBeInTheDocument();
    });

    it("renders instruction text", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [], highlights: [{ id: 1 } as any] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(
        screen.getByText(/Use the check boxes to select which notes/),
      ).toBeInTheDocument();
    });
  });

  describe("Filtering Logic", () => {
    it("only shows enrollments with notes or highlights", () => {
      const enrollmentWithContent = {
        ...mockEnrollment,
        id: "1",
        droplet: { ...mockDroplet, id: 1, name: "Has Content" },
      };

      const enrollmentWithoutContent = {
        ...mockEnrollment,
        id: "2",
        droplet: { ...mockDroplet, id: 2, name: "No Content" },
      };

      const props = {
        enrollments: [enrollmentWithContent, enrollmentWithoutContent],
        allNotes: [
          { dropletId: 1, notes: [{ id: 1 } as any], highlights: [] },
          { dropletId: 2, notes: [], highlights: [] },
        ],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Has Content")).toBeInTheDocument();
      expect(screen.queryByText("No Content")).not.toBeInTheDocument();
    });

    it("shows enrollment with only notes", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("shows enrollment with only highlights", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [], highlights: [{ id: 1 } as any] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("hides enrollment with no notes and no highlights", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.queryByTestId("notes-summary-1")).not.toBeInTheDocument();
    });
  });

  describe("Select/Deselect All", () => {
    it("selects all filtered enrollments when Select All is clicked", async () => {
      const props = {
        enrollments: [
          {
            ...mockEnrollment,
            id: "1",
            droplet: { ...mockDroplet, id: 1, name: "Droplet 1" },
          },
          {
            ...mockEnrollment,
            id: "2",
            droplet: { ...mockDroplet, id: 2, name: "Droplet 2" },
          },
        ],
        allNotes: [
          { dropletId: 1, notes: [{ id: 1 } as any], highlights: [] },
          { dropletId: 2, notes: [{ id: 2 } as any], highlights: [] },
        ],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        const checkbox1 = screen.getByLabelText(
          "Select Droplet 1",
        ) as HTMLInputElement;
        const checkbox2 = screen.getByLabelText(
          "Select Droplet 2",
        ) as HTMLInputElement;
        expect(checkbox1.checked).toBe(true);
        expect(checkbox2.checked).toBe(true);
      });
    });

    it("deselects all filtered enrollments when Deselect All is clicked", async () => {
      const props = {
        enrollments: [
          {
            ...mockEnrollment,
            id: "1",
            droplet: { ...mockDroplet, id: 1, name: "Droplet 1" },
          },
        ],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      // First select
      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          "Select Droplet 1",
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });

      // Then deselect
      fireEvent.click(screen.getByText("Deselect All"));

      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          "Select Droplet 1",
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });
    });
  });

  describe("Individual Selection", () => {
    it("updates selection when checkbox is clicked", async () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      const checkbox = screen.getByLabelText(
        "Select Test Droplet",
      ) as HTMLInputElement;

      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox.checked).toBe(true);
      });
    });

    it("deselects when checkbox is clicked again", async () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      const checkbox = screen.getByLabelText(
        "Select Test Droplet",
      ) as HTMLInputElement;

      // Select
      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox.checked).toBe(true));

      // Deselect
      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox.checked).toBe(false));
    });
  });

  describe("PDF Generation", () => {
    it("shows generating message while PDF is being created", async () => {
      const slowPdfDoc = {
        ...mockPdfDoc,
        save: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve(new Uint8Array()), 100),
              ),
          ),
      };

      (PDFDocument.create as jest.Mock).mockResolvedValue(slowPdfDoc);

      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      const checkbox = screen.getByLabelText("Select Test Droplet");
      fireEvent.click(checkbox);

      expect(screen.getByText("Generating PDF...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText("Generating PDF...")).not.toBeInTheDocument();
      });
    });

    it("handles PDF generation errors gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      (PDFDocument.create as jest.Mock).mockRejectedValue(
        new Error("PDF Error"),
      );

      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      const checkbox = screen.getByLabelText("Select Test Droplet");
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error generating PDF:",
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Empty States", () => {
    it("renders with no enrollments", () => {
      const props = {
        enrollments: [],
        allNotes: [],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Saved Notes")).toBeInTheDocument();
      expect(screen.queryByTestId(/notes-summary-/)).not.toBeInTheDocument();
    });

    it("renders when all enrollments are filtered out", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.queryByTestId("notes-summary-1")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Enrollments", () => {
    it("renders multiple note summaries", () => {
      const props = {
        enrollments: [
          {
            ...mockEnrollment,
            id: "1",
            droplet: { ...mockDroplet, id: 1, name: "Droplet 1" },
          },
          {
            ...mockEnrollment,
            id: "2",
            droplet: { ...mockDroplet, id: 2, name: "Droplet 2" },
          },
        ],
        allNotes: [
          { dropletId: 1, notes: [{ id: 1 } as any], highlights: [] },
          { dropletId: 2, notes: [], highlights: [{ id: 1 } as any] },
        ],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Droplet 1")).toBeInTheDocument();
      expect(screen.getByText("Droplet 2")).toBeInTheDocument();
    });

    it("Select All selects only filtered enrollments", async () => {
      const props = {
        enrollments: [
          {
            ...mockEnrollment,
            id: "1",
            droplet: { ...mockDroplet, id: 1, name: "Has Notes" },
          },
          {
            ...mockEnrollment,
            id: "2",
            droplet: { ...mockDroplet, id: 2, name: "No Notes" },
          },
        ],
        allNotes: [
          { dropletId: 1, notes: [{ id: 1 } as any], highlights: [] },
          { dropletId: 2, notes: [], highlights: [] },
        ],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          "Select Has Notes",
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
        expect(screen.queryByText("No Notes")).not.toBeInTheDocument();
      });
    });
  });

  describe("Button Styling", () => {
    it("Select All button has correct width", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      const selectButton = screen.getByText("Select All");
      expect(selectButton).toHaveClass("w-24");
    });

    it("Deselect All button has correct width", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      const deselectButton = screen.getByText("Deselect All");
      expect(deselectButton).toHaveClass("w-24");
    });
  });

  describe("Edge Cases", () => {
    it("handles enrollment with both notes and highlights", () => {
      const props = {
        enrollments: [mockEnrollment],
        allNotes: [
          {
            dropletId: 1,
            notes: [{ id: 1 } as any],
            highlights: [{ id: 1 } as any],
          },
        ],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("handles very long droplet names", () => {
      const longNameEnrollment = {
        ...mockEnrollment,
        droplet: { ...mockDroplet, name: "A".repeat(200) },
      };

      const props = {
        enrollments: [longNameEnrollment],
        allNotes: [{ dropletId: 1, notes: [{ id: 1 } as any], highlights: [] }],
        initialPdfBytes: new Uint8Array(),
      };

      render(<NotesManager {...props} />);

      expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
    });
  });
});
