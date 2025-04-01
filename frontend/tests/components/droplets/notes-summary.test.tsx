import { render, screen } from "@testing-library/react";
import NotesSummary from "@/components/droplets/notes-summary";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  HighlightColor,
  Tag,
} from "@/types";

describe("NotesSummary", () => {
  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    blocks: [],
    droplets: [],
    droplet_lessons: [],
    notes: [],
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
    droplet_lessons: [
      {
        id: 123,
        orderIndex: 1,
        lesson: mockLesson,
      },
    ],
  };
  const mockProps = {
    dropletHighlights: [
      {
        id: 1,
        text: "Highlight 1",
        color: "#fff300" as HighlightColor,
        position: { start: 0, end: 0 },
      },
    ],
    dropletNotes: [
      {
        id: 1,
        content: "Test note content",
        lesson: {
          id: 1,
          name: "Test Lesson",
          slug: "test-lesson",
          blocks: [],
          droplets: [],
          droplet_lessons: [
            {
              id: 123,
              orderIndex: 1,
              lesson: mockLesson,
            },
          ],
          notes: [],
        },
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
        },
        positionY: 0,
        highlight: {
          text: "Highlighted text",
          color: "#fff300" as HighlightColor,
          position: { start: 0, end: 0 },
        },
      },
    ],
    mappedLessons: [
      {
        id: 1,
        lesson: {
          id: 1,
          name: "Test Lesson",
          slug: "test-lesson",
          droplets: [],
          droplet_lessons: [
            {
              id: 123,
              orderIndex: 1,
              lesson: mockLesson,
            },
          ],
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
        },
        orderIndex: 1,
      },
    ],
    selectedColors: ["#fff300" as HighlightColor],
    allNotes: {
      dropletId: 1,
      notes: [
        {
          id: 1,
          content: "Test note content",
          lesson: {
            id: 1,
            name: "Test Lesson",
            slug: "test-lesson",
            blocks: [],
            droplets: [],
            droplet_lessons: [
              {
                id: 123,
                orderIndex: 1,
                lesson: mockLesson,
              },
            ],
            notes: [],
          },
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
          },
          positionY: 0,
          highlight: {
            text: "Highlighted text",
            color: "#fff300" as HighlightColor,
            position: { start: 0, end: 0 },
          },
        },
      ],
      highlights: [
        {
          id: 1,
          text: "Highlight 1",
          color: "#fff300" as HighlightColor,
          position: { start: 0, end: 0 },
        },
      ],
      dropletNotes: [
        {
          id: 1,
          content: "Test note content",
          lesson: {
            id: 1,
            name: "Test Lesson",
            slug: "test-lesson",
            blocks: [],
            droplets: [],
            droplet_lessons: [
              {
                id: 123,
                orderIndex: 1,
                lesson: mockLesson,
              },
            ],
            notes: [],
          },
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
          },
          positionY: 0,
          highlight: {
            text: "Highlighted text",
            color: "#fff300" as HighlightColor,
            position: { start: 0, end: 0 },
          },
        },
      ],
    },
  };

  it("shows empty state message when no notes or highlights", () => {
    const emptyProps = {
      ...mockProps,
      dropletHighlights: [],
      dropletNotes: [],
    };

    render(<NotesSummary {...emptyProps} />);

    expect(
      screen.getByText(
        "You have no saved notes or highlights for this droplet.",
      ),
    ).toBeInTheDocument();
  });

  it("filters highlights by selected colors", () => {
    const propsWithDifferentColor = {
      ...mockProps,
      dropletHighlights: [
        {
          id: 1,
          text: "Highlight 1",
          color: "#fff300" as HighlightColor,
          position: { start: 0, end: 0 },
        },
      ],
    };

    render(<NotesSummary {...propsWithDifferentColor} />);
    expect(screen.queryByText("Filtered highlight")).not.toBeInTheDocument();
  });

  it("filters notes and highlights by selected colors", () => {
    render(
      <NotesSummary
        dropletHighlights={mockProps.dropletHighlights}
        dropletNotes={mockProps.dropletNotes}
        mappedLessons={mockProps.mappedLessons}
        selectedColors={[]}
        allNotes={{
          dropletId: 1,
          notes: mockProps.allNotes.notes,
          highlights: mockProps.dropletHighlights,
        }}
      />,
    );

    expect(screen.queryByText("Test highlight")).not.toBeInTheDocument();
    expect(screen.queryByText("Highlighted text")).not.toBeInTheDocument();
  });
});
