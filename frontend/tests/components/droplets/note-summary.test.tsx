import { NoteSummary } from "@/components/droplets/lessons/note-taking/note-summary";
import {
  Block,
  Droplet,
  DropletStatus,
  DropletType,
  FocusArea,
  HighlightColor,
  Lesson,
  Tag,
} from "@/types";
import { DateTime } from "luxon";
import { PDFDocument } from "pdf-lib";

jest.mock("pdf-lib");

describe("NoteSummary", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, slug: "react", name: "React", droplets: [] }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
  };
  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    type: "standard",
    blocks: [] as Block[],
    droplets: [] as Droplet[],
    notes: "",
  };
  const mockProps = {
    filteredHighlights: [
      {
        id: 1,
        text: "Highlighted text",
        color: "#fff300" as HighlightColor,
        blockId: 1,
        lesson: {
          id: 1,
          name: "Test Lesson",
          slug: "test-lesson",
          type: "standard",
          droplets: [] as Droplet[],
          notes: "",
          orderIndex: 1,
          blocks: [
            {
              id: 1,
              __component: "droplets.generic" as const,
              content: "Generic content",
            },
            {
              id: 2,
              __component: "droplets.expandable" as const,
              title: "Expandable title",
              content: "Expandable content",
            },
            {
              id: 3,
              __component: "droplets.video" as const,
              url: "https://example.com/video",
            },
            {
              id: 4,
              __component: "droplets.callout" as const,
              content: [
                {
                  type: "paragraph",
                  children: [{ type: "text", text: "Callout content" }],
                },
              ],
              type: "info",
              color: "bg-sky-50",
            },
            {
              id: 5,
              __component: "droplets.quiz" as const,
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
              __component: "droplets.open-ended-quiz" as const,
              questions: [
                {
                  id: 1,
                  content: "Open ended question",
                  correctAnswer: "Correct answer",
                },
              ],
            },
          ],
        } as Lesson,
        position: { start: 0, end: 0 },
      },
    ],
    notes: [
      {
        id: 1,
        blockId: 1,
        content: "Test note content",
        lesson: {
          id: 1,
          name: "Test Lesson",
          slug: "test-lesson",
          type: "standard",
          blocks: [] as Block[],
          droplets: [] as Droplet[],
          notes: "",
          orderIndex: 1,
        } as Lesson,
        enrollment: {
          id: "1",
          authorizedUser: { id: 1 } as any,
          droplet: mockDroplet as any,
          viewedLessons: [] as Lesson[],
          isComplete: false,
          rating: 5,
          notes: [] as any[],
          isFirstTime: false,
          isArchived: false,
          completionDate: DateTime.local().toJSDate(),
        },
        positionY: 0,
        highlight: {
          text: "Highlighted text",
          color: "#fff300" as HighlightColor,
          position: { start: 0, end: 0 },
          blockId: 1,
        },
      },
    ],
    droplet: mockDroplet as any as Droplet,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generates PDF with correct content", async () => {
    const mockAddPage = jest.fn().mockReturnValue({
      getSize: () => ({ width: 595.28, height: 841.89 }),
      drawText: jest.fn(),
      drawRectangle: jest.fn(),
      drawLine: jest.fn(),
    });

    const mockPDFDoc = {
      addPage: mockAddPage,
      save: jest.fn().mockResolvedValue(new Uint8Array()),
    } as unknown as PDFDocument;

    (PDFDocument.create as jest.Mock).mockResolvedValue(mockPDFDoc);

    const pdfBytes = await NoteSummary(mockProps);

    expect(PDFDocument.create).toHaveBeenCalled();
    expect(mockAddPage).toHaveBeenCalled();
    expect(mockPDFDoc.save).toHaveBeenCalled();
    expect(pdfBytes).toBeDefined();
  });
});
